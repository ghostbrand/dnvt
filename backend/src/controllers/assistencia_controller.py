from fastapi import HTTPException
from datetime import datetime
from typing import List, Optional
from src.services import AssistenciaService, AcidenteService
from src.models import AssistenciaCreate, AssistenciaUpdate, AssistenciaResponse


class AssistenciaController:
    
    @staticmethod
    def _to_response(assistencia: dict) -> AssistenciaResponse:
        hora_inicio = assistencia["hora_inicio"]
        hora_fim = assistencia.get("hora_fim")
        if isinstance(hora_inicio, str):
            hora_inicio = datetime.fromisoformat(hora_inicio)
        if hora_fim and isinstance(hora_fim, str):
            hora_fim = datetime.fromisoformat(hora_fim)
        
        return AssistenciaResponse(**{**assistencia, "hora_inicio": hora_inicio, "hora_fim": hora_fim})
    
    @staticmethod
    async def create(data: AssistenciaCreate, current_user: dict) -> AssistenciaResponse:
        if current_user["tipo"] not in ["ADMIN", "POLICIA"]:
            raise HTTPException(status_code=403, detail="Sem permissão")
        
        acidente = await AcidenteService.get_by_id(data.acidente_id)
        if not acidente:
            raise HTTPException(status_code=404, detail="Acidente não encontrado")
        
        assistencia = await AssistenciaService.create(data.model_dump(), acidente)
        return AssistenciaController._to_response(assistencia)
    
    @staticmethod
    async def list(status: Optional[str] = None, acidente_id: Optional[str] = None) -> List[AssistenciaResponse]:
        assistencias = await AssistenciaService.list(status, acidente_id)
        return [AssistenciaController._to_response(a) for a in assistencias]
    
    @staticmethod
    async def update(assistencia_id: str, update: AssistenciaUpdate) -> AssistenciaResponse:
        assistencia = await AssistenciaService.get_by_id(assistencia_id)
        if not assistencia:
            raise HTTPException(status_code=404, detail="Assistência não encontrada")
        
        update_data = {k: v for k, v in update.model_dump().items() if v is not None}
        updated = await AssistenciaService.update(assistencia_id, update_data)
        return AssistenciaController._to_response(updated)
