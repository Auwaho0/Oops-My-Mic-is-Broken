from fastapi import APIRouter

from app.api.v1.routers import auth, excuses, health, sounds

api_router = APIRouter()
api_router.include_router(health.router)
api_router.include_router(auth.router)
api_router.include_router(excuses.router)
api_router.include_router(sounds.router)
