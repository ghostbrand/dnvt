from fastapi import APIRouter, Depends, Query
from typing import Optional, List
from src.controllers import AcidenteController
from src.models import AcidenteCreate, AcidenteUpdate, AcidenteResponse
from src.middlewares import get_current_user

router = APIRouter(prefix="/acidentes", tags=["Acidentes"])


@router.post("", response_model=AcidenteResponse)
async def create(acidente: AcidenteCreate, current_user: dict = Depends(get_current_user)):
    return await AcidenteController.create(acidente, current_user)


@router.get("", response_model=List[AcidenteResponse])
async def list_acidentes(
    status: Optional[str] = None,
    gravidade: Optional[str] = None,
    origem: Optional[str] = None,
    limit: int = Query(default=100, le=500),
    skip: int = 0
):
    return await AcidenteController.list(status, gravidade, origem, limit, skip)


@router.get("/ativos", response_model=List[AcidenteResponse])
async def list_ativos():
    return await AcidenteController.list_ativos()


@router.get("/{acidente_id}", response_model=AcidenteResponse)
async def get_acidente(acidente_id: str):
    return await AcidenteController.get(acidente_id)


@router.patch("/{acidente_id}", response_model=AcidenteResponse)
async def update(acidente_id: str, update: AcidenteUpdate, current_user: dict = Depends(get_current_user)):
    return await AcidenteController.update(acidente_id, update)


@router.delete("/{acidente_id}")
async def delete(acidente_id: str, current_user: dict = Depends(get_current_user)):
    return await AcidenteController.delete(acidente_id, current_user)
