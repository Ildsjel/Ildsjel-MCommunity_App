"""
User Service - Business logic for user management
"""
from typing import Optional, Dict
from datetime import datetime, timedelta
from app.db.repositories.user_repository import UserRepository
from app.auth.security import hash_password, constant_time_verify_password
from app.auth.jwt_handler import create_access_token
from app.models.user_models import UserCreate, UserLogin, TokenResponse, UserResponse
from app.services.email_service import EmailService


def _user_response(u: Dict) -> UserResponse:
    """Build a UserResponse from a raw Neo4j user dict."""
    return UserResponse(
        id=u["id"],
        handle=u["handle"],
        email=u["email"],
        country=u.get("country"),
        city=u.get("city"),
        country_code=u.get("country_code"),
        region=u.get("region"),
        latitude=u.get("latitude"),
        longitude=u.get("longitude"),
        created_at=u["created_at"],
        source_accounts=u.get("source_accounts", []),
        is_pro=u.get("is_pro", False),
        onboarding_complete=u.get("onboarding_complete", False),
        profile_image_url=u.get("profile_image_url"),
        email_verified=u.get("email_verified", False),
        is_active=u.get("is_active", False),
        about_me=u.get("about_me"),
        role=u.get("role", "user"),
        discoverable_by_name=u.get("discoverable_by_name", True),
        discoverable_by_music=u.get("discoverable_by_music", True),
        city_visible=u.get("city_visible", "city"),
    )
from app.config.settings import settings


class UserService:
    """Service layer for user operations"""
    
    def __init__(self, session):
        self.repository = UserRepository(session)
    
    async def register_user(self, user_data: UserCreate) -> Optional[Dict]:
        """
        Register a new user with email verification.

        Returns ``None`` when the email is already registered. The endpoint
        returns the same generic 202 response in that case so an attacker
        cannot tell the difference between a fresh and an existing email.
        A collision-notification email is sent to the address out-of-band so
        the legitimate owner is informed.

        Args:
            user_data: User registration data

        Returns:
            Created user data, or ``None`` if the email already exists.

        Raises:
            ValueError: If the requested handle is already taken (handles are
                public, so this is not a privacy concern).
        """
        existing_user = self.repository.get_user_by_email(user_data.email)

        # Always hash the password to keep timing constant. Without this, the
        # collision branch would skip the ~100ms bcrypt step and re-introduce
        # a timing oracle on the register endpoint.
        password_hash = hash_password(user_data.password)

        if existing_user:
            try:
                await EmailService.send_register_collision_email(
                    email=user_data.email,
                    handle=existing_user.get("handle", "")
                )
            except Exception as e:
                print(f"❌ Failed to send register collision email: {e}")
            return None

        # Check if handle already exists
        existing_handle = self.repository.get_user_by_handle(user_data.handle)
        if existing_handle:
            raise ValueError("Handle already taken")

        # Generate verification token
        verification_token = EmailService.generate_verification_token()
        verification_expires = datetime.utcnow() + timedelta(
            hours=settings.EMAIL_VERIFICATION_EXPIRE_HOURS
        )

        # Create user
        user = self.repository.create_user(
            handle=user_data.handle,
            email=user_data.email,
            password_hash=password_hash,
            verification_token=verification_token,
            verification_token_expires=verification_expires.isoformat(),
            country=user_data.country,
            city=user_data.city
        )

        # Send verification email
        try:
            await EmailService.send_verification_email(
                email=user_data.email,
                token=verification_token,
                handle=user_data.handle
            )
        except Exception as e:
            print(f"❌ Failed to send verification email: {e}")
            # Don't fail registration if email fails

        return user
    
    def authenticate_user(self, login_data: UserLogin) -> Optional[Dict]:
        """
        Authenticate user and return user data if valid.

        The ordering here matters for security:

        1. Always run bcrypt verify (against a dummy hash if the user is
           missing) so response times are identical for known/unknown emails.
        2. Only after the password is proven correct do we surface
           email-verified / account-active errors. Raising those before the
           password check would let an attacker enumerate accounts even
           without a valid password.

        Args:
            login_data: Login credentials

        Returns:
            User data if authentication successful, None otherwise.

        Raises:
            ValueError: If the password was correct but the account is not
                verified or inactive.
        """
        user = self.repository.get_user_by_email(login_data.email)

        password_hash = user.get("password_hash") if user else None
        password_ok = constant_time_verify_password(login_data.password, password_hash)

        if not user or not password_ok:
            return None

        # Password proven correct → safe to expose UX feedback now.
        if not user.get("email_verified", False):
            raise ValueError("Please verify your email before logging in")

        if not user.get("is_active", False):
            raise ValueError("Account is inactive. Please contact support.")

        # Update last login
        self.repository.update_last_login(user["id"])

        return user
    
    def create_token_response(self, user: Dict) -> TokenResponse:
        """
        Create JWT token and response for authenticated user
        
        Args:
            user: User data
        
        Returns:
            Token response with access token and user data
        """
        # Create access token
        access_token = create_access_token(
            data={"sub": user["id"], "email": user["email"]}
        )
        
        # Remove sensitive data
        user_response = _user_response(user)
        
        return TokenResponse(
            access_token=access_token,
            user=user_response
        )
    
    def get_user_profile(self, user_id: str) -> Optional[UserResponse]:
        """
        Get user profile by ID
        
        Args:
            user_id: User's ID
        
        Returns:
            User profile data or None
        """
        user = self.repository.get_user_by_id(user_id)
        
        if not user:
            return None
        
        return _user_response(user)
    
    def update_user_profile(self, user_id: str, updates: Dict) -> Optional[UserResponse]:
        """
        Update user profile
        
        Args:
            user_id: User's ID
            updates: Dictionary of fields to update
        
        Returns:
            Updated user profile or None
        """
        updated_user = self.repository.update_user(user_id, updates)
        
        if not updated_user:
            return None
        
        return _user_response(updated_user)
    
    def verify_email(self, token: str) -> Optional[Dict]:
        """
        Verify user email with token
        
        Args:
            token: Verification token
        
        Returns:
            User data if verification successful
        """
        user = self.repository.verify_email(token)
        return user
    
    async def request_password_reset(self, email: str) -> bool:
        """
        Request password reset for user
        
        Args:
            email: User's email
        
        Returns:
            True if email sent (always returns True to prevent email enumeration)
        """
        user = self.repository.get_user_by_email(email)
        
        if user:
            # Generate reset token
            reset_token = EmailService.generate_verification_token()
            reset_expires = datetime.utcnow() + timedelta(
                hours=settings.PASSWORD_RESET_EXPIRE_HOURS
            )
            
            # Save token to database
            self.repository.create_password_reset_token(
                email=email,
                token=reset_token,
                expires=reset_expires.isoformat()
            )
            
            # Send reset email
            try:
                await EmailService.send_password_reset_email(
                    email=email,
                    token=reset_token,
                    handle=user["handle"]
                )
            except Exception as e:
                print(f"❌ Failed to send password reset email: {e}")
        
        # Always return True to prevent email enumeration
        return True
    
    def reset_password(self, token: str, new_password: str) -> Optional[Dict]:
        """
        Reset user password with token
        
        Args:
            token: Reset token
            new_password: New password (plain text)
        
        Returns:
            User data if reset successful
        """
        # Hash new password
        new_password_hash = hash_password(new_password)
        
        # Reset password
        user = self.repository.reset_password(token, new_password_hash)
        return user

