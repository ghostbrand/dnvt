from fastapi import APIRouter, Depends
from typing import Optional, List
from src.controllers import AssistenciaController
from src.models import AssistenciaCreate, AssistenciaUpdate, AssistenciaResponse
from src.middlewares import get_current_user

router = APIRouter(prefix="/assistencias", tags=["Assistencias"])


@router.post("", response_model=AssistenciaResponse)
async def create(assistencia: AssistenciaCreate, current_user: dict = Depends(get_current_user)):
    return await AssistenciaController.create(assistencia, current_user)


@router.get("", response_model=List[AssistenciaResponse])
async def list_assistencias(status: Optional[str] = None, acidente_id: Optional[str] = None):
    return await AssistenciaController.list(status, acidente_id)


@router.patch("/{assistencia_id}", response_model=AssistenciaResponse)
async def update(assistencia_id: str, update: AssistenciaUpdate, current_user: dict = Depends(get_current_user)):
    return await AssistenciaController.update(assistencia_id, update)
