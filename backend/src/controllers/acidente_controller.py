from fastapi import HTTPException
from datetime import datetime
from typing import List, Optional
from src.services import AcidenteService
from src.models import AcidenteCreate, AcidenteUpdate, AcidenteResponse


class AcidenteController:
    
    @staticmethod
    def _to_response(acidente: dict) -> AcidenteResponse:
        created_at = acidente["created_at"]
        updated_at = acidente["updated_at"]
        if isinstance(created_at, str):
            created_at = datetime.fromisoformat(created_at)
        if isinstance(updated_at, str):
            updated_at = datetime.fromisoformat(updated_at)
        
        return AcidenteResponse(**{**acidente, "created_at": created_at, "updated_at": updated_at})
    
    @staticmethod
    async def create(data: AcidenteCreate, current_user: dict) -> AcidenteResponse:
        acidente = await AcidenteService.create(
            data.model_dump(),
            current_user["user_id"],
            current_user["tipo"]
        )
        return AcidenteController._to_response(acidente)
    
    @staticmethod
    async def list(
        status: Optional[str] = None,
        gravidade: Optional[str] = None,
        origem: Optional[str] = None,
        limit: int = 100,
        skip: int = 0
    ) -> List[AcidenteResponse]:
        acidentes = await AcidenteService.list(status, gravidade, origem, limit, skip)
        return [AcidenteController._to_response(a) for a in acidentes]
    
    @staticmethod
    async def list_ativos() -> List[AcidenteResponse]:
        acidentes = await AcidenteService.list_ativos()
        return [AcidenteController._to_response(a) for a in acidentes]
    
    @staticmethod
    async def get(acidente_id: str) -> AcidenteResponse:
        acidente = await AcidenteService.get_by_id(acidente_id)
        if not acidente:
            raise HTTPException(status_code=404, detail="Acidente não encontrado")
        return AcidenteController._to_response(acidente)
    
    @staticmethod
    async def update(acidente_id: str, update: AcidenteUpdate) -> AcidenteResponse:
        acidente = await AcidenteService.get_by_id(acidente_id)
        if not acidente:
            raise HTTPException(status_code=404, detail="Acidente não encontrado")
        
        update_data = {k: v for k, v in update.model_dump().items() if v is not None}
        updated = await AcidenteService.update(acidente_id, update_data)
        return AcidenteController._to_response(updated)
    
    @staticmethod
    async def delete(acidente_id: str, current_user: dict) -> dict:
        if current_user["tipo"] not in ["ADMIN", "POLICIA"]:
            raise HTTPException(status_code=403, detail="Sem permissão")
        
        deleted = await AcidenteService.delete(acidente_id)
        if not deleted:
            raise HTTPException(status_code=404, detail="Acidente não encontrado")
        
        return {"message": "Acidente removido"}
