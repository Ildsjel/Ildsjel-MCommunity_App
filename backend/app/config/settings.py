"""
Application Settings & Environment Configuration
"""
from pydantic_settings import BaseSettings
from typing import List


class Settings(BaseSettings):
    """Application settings loaded from environment variables"""
    
    # Application
    APP_NAME: str = "Grimr"
    DEBUG: bool = True
    ENVIRONMENT: str = "dev"  # dev, test, prod
    
    # CORS
    ALLOWED_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ]
    
    # Database
    NEO4J_URI: str = "bolt://localhost:7687"
    NEO4J_USER: str = "neo4j"
    NEO4J_PASSWORD: str = "password"
    
    # Authentication
    SECRET_KEY: str = "your-secret-key-change-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    
    # External APIs
    SPOTIFY_CLIENT_ID: str = ""
    SPOTIFY_CLIENT_SECRET: str = ""
    SPOTIFY_REDIRECT_URI: str = "http://localhost:3000/auth/callback"
    
    LASTFM_API_KEY: str = ""
    LASTFM_API_SECRET: str = ""
    
    DISCOGS_CONSUMER_KEY: str = ""
    DISCOGS_CONSUMER_SECRET: str = ""
    
    BANDCAMP_API_KEY: str = ""
    
    BANDSINTOWN_API_KEY: str = ""
    SONGKICK_API_KEY: str = ""
    
    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()

