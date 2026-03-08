from fastapi import HTTPException
from datetime import datetime
from typing import List, Optional
from src.services import ZonaCriticaService
from src.models import ZonaCriticaCreate, ZonaCriticaResponse


class ZonaCriticaController:
    
    @staticmethod
    def _to_response(zona: dict) -> ZonaCriticaResponse:
        created_at = zona["created_at"]
        if isinstance(created_at, str):
            created_at = datetime.fromisoformat(created_at)
        
        return ZonaCriticaResponse(**{**zona, "created_at": created_at})
    
    @staticmethod
    async def create(data: ZonaCriticaCreate, current_user: dict) -> ZonaCriticaResponse:
        if current_user["tipo"] not in ["ADMIN", "POLICIA"]:
            raise HTTPException(status_code=403, detail="Sem permissão")
        
        zona = await ZonaCriticaService.create(data.model_dump())
        return ZonaCriticaController._to_response(zona)
    
    @staticmethod
    async def list(validado: Optional[bool] = None) -> List[ZonaCriticaResponse]:
        zonas = await ZonaCriticaService.list(validado)
        return [ZonaCriticaController._to_response(z) for z in zonas]
    
    @staticmethod
    async def validar(zona_id: str, current_user: dict) -> dict:
        if current_user["tipo"] != "ADMIN":
            raise HTTPException(status_code=403, detail="Apenas administradores podem validar zonas")
        
        success = await ZonaCriticaService.validar(zona_id)
        if not success:
            raise HTTPException(status_code=404, detail="Zona não encontrada")
        
        return {"message": "Zona validada com sucesso"}
    
    @staticmethod
    async def calcular() -> List[dict]:
        return await ZonaCriticaService.calcular_automatico()
