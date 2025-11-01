"""
Grimr Backend - FastAPI Main Entry Point
"""
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from app.config.settings import settings
from app.api.v1 import auth, users
from app.db.neo4j_driver import neo4j_driver

limiter = Limiter(key_func=get_remote_address)

app = FastAPI(
    title="Grimr API",
    description="Metalheads Connect - Social Discovery Platform",
    version="0.1.0",
)

# Rate Limiting
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API routers
app.include_router(auth.router, prefix="/api/v1")
app.include_router(users.router, prefix="/api/v1")


@app.on_event("startup")
async def startup_event():
    """Initialize connections on startup"""
    print("🚀 Starting Grimr API...")
    # Verify Neo4j connection
    if neo4j_driver.verify_connectivity():
        print("✅ Neo4j connection successful")
    else:
        print("❌ Neo4j connection failed")


@app.on_event("shutdown")
async def shutdown_event():
    """Close connections on shutdown"""
    print("🛑 Shutting down Grimr API...")
    neo4j_driver.close()


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

