"""
Security utilities for password hashing and verification
"""
from passlib.context import CryptContext
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from app.auth.jwt_handler import decode_access_token

# Password hashing context
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# HTTP Bearer token scheme
security = HTTPBearer()

# Pre-computed bcrypt hash used to keep timing constant when no user is found.
# Verifying against this hash takes the same wall-clock time as verifying a real
# user, eliminating the email-enumeration timing oracle on /auth/login.
_DUMMY_PASSWORD_HASH = pwd_context.hash("not-a-real-password-constant-time-only")


def hash_password(password: str) -> str:
    """Hash a plain text password"""
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against its hash"""
    return pwd_context.verify(plain_password, hashed_password)


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


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security)
) -> dict:
    """
    Dependency to extract and validate the current user from JWT token
    
    Args:
        credentials: HTTP Bearer credentials
    
    Returns:
        User payload from token
    
    Raises:
        HTTPException: If token is invalid
    """
    token = credentials.credentials
    payload = decode_access_token(token)
    
    if payload is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    return payload

