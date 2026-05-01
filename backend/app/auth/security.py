"""
Password hashing and verification utilities.

We use the ``bcrypt`` library directly instead of going through passlib.
passlib 1.7.4 is incompatible with bcrypt >= 4.0.0: passlib's internal
"wrap-bug" detection routine hashes a >72-byte test password, which bcrypt
>= 4.0 now refuses with a ValueError — crashing before any real password
is ever touched.

Using bcrypt directly gives us:
  - bcrypt 4/5 compatibility (no passlib middle layer)
  - explicit 72-byte truncation (same semantics as old silent truncation)
  - full compatibility with existing hashes created by passlib (bcrypt's
    $2b$… format is self-describing; the verifier reads rounds/salt from
    the stored hash)
"""
import bcrypt as _bcrypt

_ROUNDS = 12
_MAX_BYTES = 72  # bcrypt hard limit


def _to_bytes(password: str) -> bytes:
    """Encode *password* as UTF-8 and truncate to bcrypt's 72-byte limit.

    Truncation happens on a raw byte boundary (not a character boundary).
    This matches the behaviour of bcrypt < 4.0, which silently did the same
    thing, so existing stored hashes remain verifiable.
    """
    return password.encode("utf-8")[:_MAX_BYTES]


def hash_password(password: str) -> str:
    salt = _bcrypt.gensalt(rounds=_ROUNDS)
    return _bcrypt.hashpw(_to_bytes(password), salt).decode("utf-8")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    try:
        return _bcrypt.checkpw(
            _to_bytes(plain_password),
            hashed_password.encode("utf-8"),
        )
    except Exception:
        return False


# Pre-computed bcrypt hash used to keep timing constant when no user is found.
# Verifying against this hash takes the same wall-clock time as verifying a real
# user, eliminating the email-enumeration timing oracle on /auth/login.
_DUMMY_PASSWORD_HASH = hash_password("not-a-real-password-constant-time-only")


def constant_time_verify_password(plain_password: str, hashed_password: str | None) -> bool:
    """Verify a password while always running bcrypt, even when no user exists.

    When ``hashed_password`` is ``None`` (user not found) we still run bcrypt
    against a dummy hash and force the result to ``False``. This keeps the
    response time identical for "user not found" and "wrong password" so
    attackers cannot enumerate accounts via timing.
    """
    target = hashed_password if hashed_password is not None else _DUMMY_PASSWORD_HASH
    matched = verify_password(plain_password, target)
    return matched and hashed_password is not None
