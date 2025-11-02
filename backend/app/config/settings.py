"""
Application Settings & Environment Configuration
"""
from pydantic_settings import BaseSettings
from typing import List, Union
from pydantic import field_validator


class Settings(BaseSettings):
    """Application settings loaded from environment variables"""
    
    # Application
    APP_NAME: str = "Grimr"
    DEBUG: bool = True
    ENVIRONMENT: str = "dev"  # dev, test, prod
    
    # CORS
    ALLOWED_ORIGINS: Union[List[str], str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3001",
    ]
    
    @field_validator('ALLOWED_ORIGINS', mode='before')
    @classmethod
    def parse_cors(cls, v):
        if isinstance(v, str):
            return [origin.strip() for origin in v.split(',')]
        return v
    
    # Database
    NEO4J_URI: str = "bolt://localhost:7687"
    NEO4J_USER: str = "neo4j"
    NEO4J_PASSWORD: str = "password"
    
    # Authentication
    SECRET_KEY: str = "your-secret-key-change-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    
    # Email Verification
    EMAIL_VERIFICATION_EXPIRE_HOURS: int = 24
    PASSWORD_RESET_EXPIRE_HOURS: int = 1
    
    # SMTP Settings
    SMTP_ENABLED: bool = False  # Set to True in production
    SMTP_HOST: str = "smtp.gmail.com"
    SMTP_PORT: int = 587
    SMTP_USERNAME: str = ""
    SMTP_PASSWORD: str = ""
    SMTP_FROM_EMAIL: str = "noreply@grimr.app"
    SMTP_USE_TLS: bool = True
    
    # Frontend URL
    FRONTEND_URL: str = "http://localhost:3000"
    
    # External APIs
    SPOTIFY_CLIENT_ID: str = ""
    SPOTIFY_CLIENT_SECRET: str = ""
    SPOTIFY_REDIRECT_URI: str = "http://127.0.0.1:3001/spotify/connect"
    
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

