"""
Authentication API Endpoints
"""
from fastapi import APIRouter, Depends, HTTPException, status, Request
from slowapi import Limiter
from slowapi.util import get_remote_address
from pydantic import BaseModel
from app.models.user_models import UserCreate, UserLogin, TokenResponse, UserResponse
from app.services.user_service import UserService
from app.db.neo4j_driver import get_neo4j_session

router = APIRouter(prefix="/auth", tags=["Authentication"])
limiter = Limiter(key_func=get_remote_address)


class VerifyEmailRequest(BaseModel):
    """Request model for email verification"""
    token: str


class PasswordResetRequest(BaseModel):
    """Request model for password reset"""
    email: str


class PasswordResetConfirm(BaseModel):
    """Request model for password reset confirmation"""
    token: str
    new_password: str


@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
@limiter.limit("5/hour")
async def register(
    request: Request,
    user_data: UserCreate,
    session = Depends(get_neo4j_session)
):
    """
    Register a new user with email verification
    
    Rate limit: 5 requests per hour per IP
    
    Args:
        user_data: User registration data
        session: Neo4j database session
    
    Returns:
        Created user data (email_verified=False, is_active=False)
    
    Raises:
        HTTPException: If email already exists or validation fails
    """
    user_service = UserService(session)
    
    try:
        user = await user_service.register_user(user_data)
        return UserResponse(**user)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.post("/login", response_model=TokenResponse)
@limiter.limit("10/minute")
async def login(
    request: Request,
    login_data: UserLogin,
    session = Depends(get_neo4j_session)
):
    """
    Authenticate user and return JWT token
    
    Rate limit: 10 requests per minute per IP
    
    Args:
        login_data: Login credentials
        session: Neo4j database session
    
    Returns:
        JWT token and user data
    
    Raises:
        HTTPException: If credentials are invalid or account not verified
    """
    user_service = UserService(session)
    
    try:
        user = user_service.authenticate_user(login_data)
        
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        token_response = user_service.create_token_response(user)
        return token_response
    
    except ValueError as e:
        # Email not verified or account inactive
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=str(e)
        )


@router.post("/verify-email", status_code=status.HTTP_200_OK)
async def verify_email(
    verify_data: VerifyEmailRequest,
    session = Depends(get_neo4j_session)
):
    """
    Verify user email with token
    
    Args:
        verify_data: Verification token
        session: Neo4j database session
    
    Returns:
        Success message
    
    Raises:
        HTTPException: If token is invalid or expired
    """
    user_service = UserService(session)
    
    user = user_service.verify_email(verify_data.token)
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired verification token"
        )
    
    return {"message": "Email verified successfully. You can now log in."}


@router.post("/request-password-reset", status_code=status.HTTP_200_OK)
@limiter.limit("3/hour")
async def request_password_reset(
    request: Request,
    reset_data: PasswordResetRequest,
    session = Depends(get_neo4j_session)
):
    """
    Request password reset email
    
    Rate limit: 3 requests per hour per IP
    
    Args:
        reset_data: Email address
        session: Neo4j database session
    
    Returns:
        Success message (always, to prevent email enumeration)
    """
    user_service = UserService(session)
    
    await user_service.request_password_reset(reset_data.email)
    
    return {
        "message": "If the email exists, a password reset link has been sent."
    }


@router.post("/reset-password", status_code=status.HTTP_200_OK)
async def reset_password(
    reset_data: PasswordResetConfirm,
    session = Depends(get_neo4j_session)
):
    """
    Reset password with token
    
    Args:
        reset_data: Reset token and new password
        session: Neo4j database session
    
    Returns:
        Success message
    
    Raises:
        HTTPException: If token is invalid or expired
    """
    user_service = UserService(session)
    
    user = user_service.reset_password(reset_data.token, reset_data.new_password)
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired reset token"
        )
    
    return {"message": "Password reset successfully. You can now log in."}


@router.post("/dev/verify-user")
async def dev_verify_user(
    email: str,
    session = Depends(get_neo4j_session)
):
    """
    DEV MODE ONLY: Manually verify a user's email
    
    This endpoint should be removed or protected in production!
    """
    from app.config.settings import settings
    
    if settings.ENVIRONMENT != "dev":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This endpoint is only available in development mode"
        )
    
    query = """
    MATCH (u:User {email: $email})
    SET u.email_verified = true,
        u.is_active = true,
        u.verification_token = null,
        u.verification_token_expires = null
    RETURN u.handle as handle, u.email as email
    """
    
    result = session.run(query, email=email)
    record = result.single()
    
    if not record:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User with email {email} not found"
        )
    
    return {
        "message": f"User {record['handle']} ({record['email']}) verified successfully",
        "handle": record["handle"],
        "email": record["email"]
    }
