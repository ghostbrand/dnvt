from datetime import datetime, timezone
from typing import Optional
from src.services import EstatisticaService


class EstatisticaController:
    
    @staticmethod
    async def get_resumo() -> dict:
        return await EstatisticaService.get_resumo()
    
    @staticmethod
    async def get_mensal(ano: Optional[int] = None, mes: Optional[int] = None) -> dict:
        now = datetime.now(timezone.utc)
        ano = ano or now.year
        mes = mes or now.month
        return await EstatisticaService.get_mensal(ano, mes)
    
    @staticmethod
    async def get_por_hora() -> list:
        return await EstatisticaService.get_por_hora()
    
    @staticmethod
    async def get_por_dia_semana() -> list:
        return await EstatisticaService.get_por_dia_semana()
