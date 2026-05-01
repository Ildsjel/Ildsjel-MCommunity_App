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
