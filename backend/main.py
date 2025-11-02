"""
Grimr Backend - FastAPI Main Entry Point
"""
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from pathlib import Path
from app.config.settings import settings
from app.api.v1 import auth, users, spotify, gallery, stats, search, comments
from app.db.neo4j_driver import neo4j_driver


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifespan context manager for startup and shutdown events"""
    # Startup
    print("🚀 Starting Grimr API...")
    if neo4j_driver.verify_connectivity():
        print("✅ Neo4j connection successful")
    else:
        print("❌ Neo4j connection failed")
    
    # Start Spotify polling service
    from app.services.spotify_polling_service import polling_service
    await polling_service.start()
    
    yield
    
    # Shutdown
    print("🛑 Shutting down Grimr API...")
    from app.services.spotify_polling_service import polling_service
    await polling_service.stop()
    neo4j_driver.close()


limiter = Limiter(key_func=get_remote_address)

app = FastAPI(
    title="Grimr API",
    description="Metalheads Connect - Social Discovery Platform",
    version="0.1.0",
    lifespan=lifespan,
)

# Rate Limiting
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS if isinstance(settings.ALLOWED_ORIGINS, list) else [settings.ALLOWED_ORIGINS],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allow_headers=["*"],
    expose_headers=["*"],
)

# Include API routers
app.include_router(auth.router, prefix="/api/v1")
app.include_router(users.router, prefix="/api/v1")
app.include_router(spotify.router, prefix="/api/v1")
app.include_router(gallery.router, prefix="/api/v1")
app.include_router(stats.router, prefix="/api/v1")
app.include_router(search.router, prefix="/api/v1")
app.include_router(comments.router, prefix="/api/v1")

# Mount static files for uploads
uploads_dir = Path("/app/uploads")
uploads_dir.mkdir(parents=True, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=str(uploads_dir)), name="uploads")




@app.get("/")
async def root():
    """Health check endpoint"""
    return {
        "status": "ok",
        "service": "Grimr API",
        "version": "0.1.0"
    }


@app.get("/health")
async def health_check():
    """Detailed health check"""
    neo4j_healthy = neo4j_driver.verify_connectivity()
    
    return {
        "status": "healthy" if neo4j_healthy else "degraded",
        "database": "connected" if neo4j_healthy else "disconnected",
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True
    )

