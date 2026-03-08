from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class AssistenciaCreate(BaseModel):
    acidente_id: str
    tipo: str
    latitude_atual: Optional[float] = None
    longitude_atual: Optional[float] = None


class AssistenciaUpdate(BaseModel):
    status: Optional[str] = None
    latitude_atual: Optional[float] = None
    longitude_atual: Optional[float] = None


class AssistenciaResponse(BaseModel):
    assistencia_id: str
    acidente_id: str
    tipo: str
    status: str
    latitude_atual: Optional[float] = None
    longitude_atual: Optional[float] = None
    hora_inicio: datetime
    hora_fim: Optional[datetime] = None
