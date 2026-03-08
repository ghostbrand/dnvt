# Routes __init__.py
from fastapi import APIRouter
from .auth_routes import router as auth_router
from .user_routes import router as user_router
from .acidente_routes import router as acidente_router
from .boletim_routes import router as boletim_router
from .assistencia_routes import router as assistencia_router
from .zona_critica_routes import router as zona_critica_router
from .configuracao_routes import router as configuracao_router, sms_router
from .estatistica_routes import router as estatistica_router


def register_routes(app):
    """Register all API routes"""
    api_router = APIRouter(prefix="/api")
    
    api_router.include_router(auth_router)
    api_router.include_router(user_router)
    api_router.include_router(acidente_router)
    api_router.include_router(boletim_router)
    api_router.include_router(assistencia_router)
    api_router.include_router(zona_critica_router)
    api_router.include_router(configuracao_router)
    api_router.include_router(sms_router)
    api_router.include_router(estatistica_router)
    
    app.include_router(api_router)
