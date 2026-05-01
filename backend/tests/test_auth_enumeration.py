"""
Regression tests for the user-enumeration vulnerabilities reported in the
"User-Enumeration via Login Timing & Register-Endpoint" Notion task.

Two attack vectors had to be closed:

* **Login timing oracle** — `bcrypt.checkpw` only ran when the user existed,
  so the response time leaked whether an email was registered.
* **Register error message** — `400 "Email already registered"` directly
  confirmed account existence to anyone who could submit the form.

These tests pin the fixed behaviour in place by exercising the service
layer directly with mocked repositories. They do not require Neo4j or SMTP.
"""
import sys
import os
import time
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.auth.security import (
    constant_time_verify_password,
    hash_password,
    _DUMMY_PASSWORD_HASH,
)
from app.services.user_service import UserService
from app.models.user_models import UserLogin, UserCreate


# -----------------------------------------------------------------------------
# Helpers
# -----------------------------------------------------------------------------

def _make_service_with_user(user_dict):
    """Return a UserService whose repository.get_user_by_email yields ``user_dict``."""
    service = UserService(session=MagicMock())
    service.repository = MagicMock()
    service.repository.get_user_by_email.return_value = user_dict
    service.repository.get_user_by_handle.return_value = None
    service.repository.update_last_login.return_value = None
    return service


def _verified_user(password: str = "CorrectHorse1!"):
    return {
        "id": "u-123",
        "handle": "metalfan",
        "email": "metalfan@example.com",
        "password_hash": hash_password(password),
        "email_verified": True,
        "is_active": True,
    }


# -----------------------------------------------------------------------------
# Vector A — Login timing oracle
# -----------------------------------------------------------------------------

class TestConstantTimeVerifyPassword:
    """The constant_time_verify_password helper is the foundation of the fix."""

    def test_returns_false_when_no_hash(self):
        assert constant_time_verify_password("anything", None) is False

    def test_returns_false_for_wrong_password(self):
        hashed = hash_password("right-password")
        assert constant_time_verify_password("wrong-password", hashed) is False

    def test_returns_true_for_correct_password(self):
        hashed = hash_password("right-password-1!")
        assert constant_time_verify_password("right-password-1!", hashed) is True

    def test_runs_bcrypt_against_dummy_when_hash_missing(self):
        """Even with no user we must still run bcrypt — that's the whole point."""
        with patch("app.auth.security.verify_password", return_value=False) as mock_verify:
            constant_time_verify_password("anything", None)
            mock_verify.assert_called_once()
            # The fallback hash must be the pre-computed dummy, not None.
            args, _ = mock_verify.call_args
            assert args[1] == _DUMMY_PASSWORD_HASH


class TestLoginEnumerationFix:
    """Login must not leak whether an email is registered."""

    def test_authenticate_calls_verify_when_user_missing(self):
        """No-user path must still invoke bcrypt to keep timing constant."""
        service = _make_service_with_user(None)

        with patch(
            "app.services.user_service.constant_time_verify_password",
            return_value=False,
        ) as mock_verify:
            result = service.authenticate_user(
                UserLogin(email="ghost@example.com", password="whatever1!")
            )

        assert result is None
        mock_verify.assert_called_once()
        # Second arg is the hash; it must be None so the helper falls back to dummy.
        args, _ = mock_verify.call_args
        assert args[1] is None

    def test_authenticate_returns_none_for_wrong_password(self):
        service = _make_service_with_user(_verified_user("real-password-1!"))
        result = service.authenticate_user(
            UserLogin(email="metalfan@example.com", password="wrong-password-1!")
        )
        assert result is None

    def test_authenticate_does_not_leak_unverified_before_password_check(self):
        """Old bug: ValueError('verify your email') fired before bcrypt ran,
        so an attacker without a password could enumerate unverified accounts.
        With the fix, a wrong password on an unverified account must return
        None (= generic 401) not raise the verify-email error."""
        user = _verified_user("real-password-1!")
        user["email_verified"] = False
        service = _make_service_with_user(user)

        result = service.authenticate_user(
            UserLogin(email="metalfan@example.com", password="wrong-password-1!")
        )
        assert result is None  # i.e. no ValueError surfaced to the endpoint

    def test_authenticate_raises_unverified_only_with_correct_password(self):
        """Legitimate UX is preserved: if you actually know the password, we
        tell you to verify your email."""
        user = _verified_user("real-password-1!")
        user["email_verified"] = False
        service = _make_service_with_user(user)

        with pytest.raises(ValueError, match="verify your email"):
            service.authenticate_user(
                UserLogin(email="metalfan@example.com", password="real-password-1!")
            )

    def test_authenticate_succeeds_with_correct_password(self):
        user = _verified_user("real-password-1!")
        service = _make_service_with_user(user)
        result = service.authenticate_user(
            UserLogin(email="metalfan@example.com", password="real-password-1!")
        )
        assert result is user
        service.repository.update_last_login.assert_called_once_with(user["id"])

    @pytest.mark.slow
    def test_login_timing_delta_is_small(self):
        """End-to-end timing check at the service layer.

        The original report measured a 139 ms delta between known and unknown
        emails. After the fix both paths run bcrypt once, so the delta should
        be well under 50 ms even on slow hardware. We use a generous bound to
        avoid CI flakiness while still catching a regression to the old code.
        """
        user = _verified_user("real-password-1!")
        existing_service = _make_service_with_user(user)
        missing_service = _make_service_with_user(None)

        def measure(service):
            start = time.perf_counter()
            try:
                service.authenticate_user(
                    UserLogin(email="metalfan@example.com", password="wrong-password-1!")
                )
            except ValueError:
                pass  # not expected here, but don't blow up
            return (time.perf_counter() - start) * 1000

        # Warm-up so the first bcrypt call doesn't dominate.
        measure(existing_service)
        measure(missing_service)

        existing_times = [measure(existing_service) for _ in range(5)]
        missing_times = [measure(missing_service) for _ in range(5)]

        avg_existing = sum(existing_times) / len(existing_times)
        avg_missing = sum(missing_times) / len(missing_times)
        delta = abs(avg_existing - avg_missing)

        # Pre-fix delta was ~139 ms. 50 ms gives ample headroom for noisy CI.
        assert delta < 50, (
            f"Login timing delta {delta:.1f} ms (existing avg {avg_existing:.1f}, "
            f"missing avg {avg_missing:.1f}) — enumeration oracle may have regressed"
        )


# -----------------------------------------------------------------------------
# Vector B — Register endpoint enumeration
# -----------------------------------------------------------------------------

class TestRegisterEnumerationFix:
    """register_user must not reveal whether an email is already registered."""

    @pytest.mark.asyncio
    async def test_register_returns_none_on_email_collision(self):
        """Old behaviour raised ValueError('Email already registered'). The
        fix turns the collision into a silent no-op so the endpoint can return
        the same generic 202 for new and existing emails."""
        existing = {"handle": "metalfan", "email": "metalfan@example.com"}
        service = UserService(session=MagicMock())
        service.repository = MagicMock()
        service.repository.get_user_by_email.return_value = existing

        with patch(
            "app.services.user_service.EmailService.send_register_collision_email",
            new=AsyncMock(),
        ):
            result = await service.register_user(
                UserCreate(
                    handle="newhandle",
                    email="metalfan@example.com",
                    password="ValidPass1!",
                )
            )

        assert result is None
        service.repository.create_user.assert_not_called()

    @pytest.mark.asyncio
    async def test_register_sends_collision_email_on_existing_email(self):
        existing = {"handle": "metalfan", "email": "metalfan@example.com"}
        service = UserService(session=MagicMock())
        service.repository = MagicMock()
        service.repository.get_user_by_email.return_value = existing

        collision_mock = AsyncMock()
        with patch(
            "app.services.user_service.EmailService.send_register_collision_email",
            new=collision_mock,
        ):
            await service.register_user(
                UserCreate(
                    handle="newhandle",
                    email="metalfan@example.com",
                    password="ValidPass1!",
                )
            )

        collision_mock.assert_awaited_once()
        kwargs = collision_mock.await_args.kwargs
        assert kwargs["email"] == "metalfan@example.com"
        assert kwargs["handle"] == "metalfan"

    @pytest.mark.asyncio
    async def test_register_hashes_password_on_collision(self):
        """Without this, the collision branch is much faster than the
        success branch (no bcrypt). That's a register-side timing oracle."""
        existing = {"handle": "metalfan", "email": "metalfan@example.com"}
        service = UserService(session=MagicMock())
        service.repository = MagicMock()
        service.repository.get_user_by_email.return_value = existing

        with patch(
            "app.services.user_service.EmailService.send_register_collision_email",
            new=AsyncMock(),
        ), patch(
            "app.services.user_service.hash_password",
            wraps=hash_password,
        ) as hash_spy:
            await service.register_user(
                UserCreate(
                    handle="newhandle",
                    email="metalfan@example.com",
                    password="ValidPass1!",
                )
            )

        hash_spy.assert_called_once()

    @pytest.mark.asyncio
    async def test_register_creates_user_for_new_email(self):
        service = UserService(session=MagicMock())
        service.repository = MagicMock()
        service.repository.get_user_by_email.return_value = None
        service.repository.get_user_by_handle.return_value = None
        service.repository.create_user.return_value = {
            "id": "u-1",
            "handle": "newhandle",
            "email": "fresh@example.com",
        }

        with patch(
            "app.services.user_service.EmailService.send_verification_email",
            new=AsyncMock(),
        ) as verify_mock, patch(
            "app.services.user_service.EmailService.send_register_collision_email",
            new=AsyncMock(),
        ) as collision_mock:
            result = await service.register_user(
                UserCreate(
                    handle="newhandle",
                    email="fresh@example.com",
                    password="ValidPass1!",
                )
            )

        assert result is not None
        assert result["email"] == "fresh@example.com"
        verify_mock.assert_awaited_once()
        collision_mock.assert_not_called()
        service.repository.create_user.assert_called_once()

    @pytest.mark.asyncio
    async def test_register_still_rejects_handle_collision(self):
        """Handles are public so a 400 here is acceptable; we just want to
        confirm the existing UX still works after the email-path rewrite."""
        service = UserService(session=MagicMock())
        service.repository = MagicMock()
        service.repository.get_user_by_email.return_value = None
        service.repository.get_user_by_handle.return_value = {"handle": "taken"}

        with pytest.raises(ValueError, match="Handle already taken"):
            await service.register_user(
                UserCreate(
                    handle="taken",
                    email="fresh@example.com",
                    password="ValidPass1!",
                )
            )
