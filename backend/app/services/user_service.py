"""
User Service - Business logic for user management
"""
from typing import Optional, Dict
from datetime import datetime, timedelta
from app.db.repositories.user_repository import UserRepository
from app.auth.security import hash_password, verify_password
from app.auth.jwt_handler import create_access_token
from app.models.user_models import UserCreate, UserLogin, TokenResponse, UserResponse
from app.services.email_service import EmailService
from app.config.settings import settings


class UserService:
    """Service layer for user operations"""
    
    def __init__(self, session):
        self.repository = UserRepository(session)
    
    async def register_user(self, user_data: UserCreate) -> Dict:
        """
        Register a new user with email verification
        
        Args:
            user_data: User registration data
        
        Returns:
            Created user data
        
        Raises:
            ValueError: If email already exists or validation fails
        """
        # Check if email already exists
        existing_user = self.repository.get_user_by_email(user_data.email)
        if existing_user:
            raise ValueError("Email already registered")
        
        # Check if handle already exists
        existing_handle = self.repository.get_user_by_handle(user_data.handle)
        if existing_handle:
            raise ValueError("Handle already taken")
        
        # Hash password
        password_hash = hash_password(user_data.password)
        
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
        Authenticate user and return user data if valid
        
        Args:
            login_data: Login credentials
        
        Returns:
            User data if authentication successful, None otherwise
        
        Raises:
            ValueError: If account is not verified or inactive
        """
        user = self.repository.get_user_by_email(login_data.email)
        
        if not user:
            return None
        
        # Check if email is verified
        if not user.get("email_verified", False):
            raise ValueError("Please verify your email before logging in")
        
        # Check if account is active
        if not user.get("is_active", False):
            raise ValueError("Account is inactive. Please contact support.")
        
        # Verify password
        if not verify_password(login_data.password, user["password_hash"]):
            return None
        
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
        user_response = UserResponse(
            id=user["id"],
            handle=user["handle"],
            email=user["email"],
            country=user.get("country"),
            city=user.get("city"),
            created_at=user["created_at"],
            source_accounts=user.get("source_accounts", []),
            is_pro=user.get("is_pro", False),
            onboarding_complete=user.get("onboarding_complete", False),
            profile_image_url=user.get("profile_image_url"),
            email_verified=user.get("email_verified", False),
            is_active=user.get("is_active", False)
        )
        
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
        
        return UserResponse(
            id=user["id"],
            handle=user["handle"],
            email=user["email"],
            country=user.get("country"),
            city=user.get("city"),
            created_at=user["created_at"],
            source_accounts=user.get("source_accounts", []),
            is_pro=user.get("is_pro", False),
            onboarding_complete=user.get("onboarding_complete", False),
            profile_image_url=user.get("profile_image_url"),
            email_verified=user.get("email_verified", False),
            is_active=user.get("is_active", False),
            about_me=user.get("about_me"),
            discoverable_by_name=user.get("discoverable_by_name", True),
            discoverable_by_music=user.get("discoverable_by_music", True),
            city_visible=user.get("city_visible", "city")
        )
    
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
        
        return UserResponse(
            id=updated_user["id"],
            handle=updated_user["handle"],
            email=updated_user["email"],
            country=updated_user.get("country"),
            city=updated_user.get("city"),
            created_at=updated_user["created_at"],
            source_accounts=updated_user.get("source_accounts", []),
            is_pro=updated_user.get("is_pro", False),
            onboarding_complete=updated_user.get("onboarding_complete", False),
            profile_image_url=updated_user.get("profile_image_url"),
            email_verified=updated_user.get("email_verified", False),
            is_active=updated_user.get("is_active", False),
            about_me=updated_user.get("about_me")
        )
    
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

