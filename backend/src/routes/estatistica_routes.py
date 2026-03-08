from fastapi import APIRouter
from typing import Optional
from src.controllers import EstatisticaController

router = APIRouter(prefix="/estatisticas", tags=["Estatisticas"])


@router.get("/resumo")
async def get_resumo():
    return await EstatisticaController.get_resumo()


@router.get("/mensal")
async def get_mensal(ano: Optional[int] = None, mes: Optional[int] = None):
    return await EstatisticaController.get_mensal(ano, mes)


@router.get("/por-hora")
async def get_por_hora():
    return await EstatisticaController.get_por_hora()


@router.get("/por-dia-semana")
async def get_por_dia_semana():
    return await EstatisticaController.get_por_dia_semana()
