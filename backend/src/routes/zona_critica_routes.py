from fastapi import APIRouter, Depends
from typing import Optional, List
from src.controllers import ZonaCriticaController
from src.models import ZonaCriticaCreate, ZonaCriticaResponse
from src.middlewares import get_current_user

router = APIRouter(prefix="/zonas-criticas", tags=["Zonas Criticas"])


@router.post("", response_model=ZonaCriticaResponse)
async def create(zona: ZonaCriticaCreate, current_user: dict = Depends(get_current_user)):
    return await ZonaCriticaController.create(zona, current_user)


@router.get("", response_model=List[ZonaCriticaResponse])
async def list_zonas(validado: Optional[bool] = None):
    return await ZonaCriticaController.list(validado)


@router.patch("/{zona_id}/validar")
async def validar(zona_id: str, current_user: dict = Depends(get_current_user)):
    return await ZonaCriticaController.validar(zona_id, current_user)


@router.get("/calcular")
async def calcular():
    return await ZonaCriticaController.calcular()
