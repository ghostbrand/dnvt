from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime


class AcidenteCreate(BaseModel):
    latitude: float
    longitude: float
    endereco: Optional[str] = None
    descricao: str
    gravidade: str = "MODERADO"
    tipo_acidente: str = "OUTRO"
    causa_principal: Optional[str] = None
    numero_vitimas: int = 0
    numero_veiculos: int = 1
    origem_registro: str = "WEB_POLICIA"
    fotos: Optional[List[str]] = []


class AcidenteUpdate(BaseModel):
    status: Optional[str] = None
    gravidade: Optional[str] = None
    descricao: Optional[str] = None
    confirmado_oficialmente: Optional[bool] = None
    causa_principal: Optional[str] = None


class AcidenteResponse(BaseModel):
    acidente_id: str
    latitude: float
    longitude: float
    endereco: Optional[str] = None
    descricao: str
    gravidade: str
    tipo_acidente: str
    causa_principal: Optional[str] = None
    numero_vitimas: int
    numero_veiculos: int
    status: str
    origem_registro: str
    confirmado_oficialmente: bool
    fotos: List[str]
    created_at: datetime
    updated_at: datetime
    created_by: Optional[str] = None
