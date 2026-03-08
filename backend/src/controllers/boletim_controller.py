from fastapi import HTTPException, UploadFile
from datetime import datetime
from typing import List
import base64
from src.services import BoletimService, AcidenteService
from src.models import BoletimCreate, BoletimResponse
from src.utils.pdf import generate_boletim_pdf


class BoletimController:
    
    @staticmethod
    def _to_response(boletim: dict) -> BoletimResponse:
        created_at = boletim["created_at"]
        if isinstance(created_at, str):
            created_at = datetime.fromisoformat(created_at)
        
        return BoletimResponse(**{**boletim, "created_at": created_at})
    
    @staticmethod
    async def create(data: BoletimCreate, current_user: dict) -> BoletimResponse:
        acidente = await AcidenteService.get_by_id(data.acidente_id)
        if not acidente:
            raise HTTPException(status_code=404, detail="Acidente não encontrado")
        
        boletim = await BoletimService.create(data.model_dump(), current_user["user_id"])
        return BoletimController._to_response(boletim)
    
    @staticmethod
    async def list(limit: int = 100, skip: int = 0) -> List[BoletimResponse]:
        boletins = await BoletimService.list(limit, skip)
        return [BoletimController._to_response(b) for b in boletins]
    
    @staticmethod
    async def get(boletim_id: str) -> BoletimResponse:
        boletim = await BoletimService.get_by_id(boletim_id)
        if not boletim:
            raise HTTPException(status_code=404, detail="Boletim não encontrado")
        return BoletimController._to_response(boletim)
    
    @staticmethod
    async def upload_file(boletim_id: str, file: UploadFile) -> dict:
        boletim = await BoletimService.get_by_id(boletim_id)
        if not boletim:
            raise HTTPException(status_code=404, detail="Boletim não encontrado")
        
        content = await file.read()
        file_data = base64.b64encode(content).decode('utf-8')
        
        await BoletimService.upload_file(boletim_id, file_data, file.filename)
        
        return {"message": "Arquivo enviado com sucesso"}
    
    @staticmethod
    async def generate_pdf(boletim_id: str, current_user: dict):
        boletim = await BoletimService.get_by_id(boletim_id)
        if not boletim:
            raise HTTPException(status_code=404, detail="Boletim não encontrado")
        
        acidente = await AcidenteService.get_by_id(boletim["acidente_id"])
        if not acidente:
            raise HTTPException(status_code=404, detail="Acidente associado não encontrado")
        
        pdf_buffer = generate_boletim_pdf(boletim, acidente, current_user)
        filename = f"boletim_{boletim['numero_processo'].replace('-', '_')}.pdf"
        
        return pdf_buffer, filename
