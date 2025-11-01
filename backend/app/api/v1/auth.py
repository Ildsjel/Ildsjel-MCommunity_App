"""
Authentication API Endpoints
"""
from fastapi import APIRouter, Depends, HTTPException, status
from app.models.user_models import UserCreate, UserLogin, TokenResponse
from app.services.user_service import UserService
from app.db.neo4j_driver import get_neo4j_session

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
async def register(
    user_data: UserCreate,
    session = Depends(get_neo4j_session)
):
    """
    Register a new user
    
    Args:
        user_data: User registration data
        session: Neo4j database session
    
    Returns:
        JWT token and user data
    
    Raises:
        HTTPException: If email already exists
    """
    user_service = UserService(session)
    
    try:
        user = user_service.register_user(user_data)
        token_response = user_service.create_token_response(user)
        return token_response
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.post("/login", response_model=TokenResponse)
async def login(
    login_data: UserLogin,
    session = Depends(get_neo4j_session)
):
    """
    Authenticate user and return JWT token
    
    Args:
        login_data: Login credentials
        session: Neo4j database session
    
    Returns:
        JWT token and user data
    
    Raises:
        HTTPException: If credentials are invalid
    """
    user_service = UserService(session)
    
    user = user_service.authenticate_user(login_data)
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    token_response = user_service.create_token_response(user)
    return token_response

