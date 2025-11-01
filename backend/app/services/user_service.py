"""
User Service - Business logic for user management
"""
from typing import Optional, Dict
from app.db.repositories.user_repository import UserRepository
from app.auth.security import hash_password, verify_password
from app.auth.jwt_handler import create_access_token
from app.models.user_models import UserCreate, UserLogin, TokenResponse, UserResponse


class UserService:
    """Service layer for user operations"""
    
    def __init__(self, session):
        self.repository = UserRepository(session)
    
    def register_user(self, user_data: UserCreate) -> Dict:
        """
        Register a new user
        
        Args:
            user_data: User registration data
        
        Returns:
            Created user data
        
        Raises:
            ValueError: If email already exists
        """
        # Check if email already exists
        existing_user = self.repository.get_user_by_email(user_data.email)
        if existing_user:
            raise ValueError("Email already registered")
        
        # Hash password
        password_hash = hash_password(user_data.password)
        
        # Create user
        user = self.repository.create_user(
            handle=user_data.handle,
            email=user_data.email,
            password_hash=password_hash,
            country=user_data.country,
            city=user_data.city
        )
        
        return user
    
    def authenticate_user(self, login_data: UserLogin) -> Optional[Dict]:
        """
        Authenticate user and return user data if valid
        
        Args:
            login_data: Login credentials
        
        Returns:
            User data if authentication successful, None otherwise
        """
        user = self.repository.get_user_by_email(login_data.email)
        
        if not user:
            return None
        
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
            profile_image_url=user.get("profile_image_url")
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
            profile_image_url=user.get("profile_image_url")
        )

