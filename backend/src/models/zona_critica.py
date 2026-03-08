from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class ZonaCriticaCreate(BaseModel):
    latitude_centro: float
    longitude_centro: float
    raio_metros: int = 500
    nome: Optional[str] = None


class ZonaCriticaResponse(BaseModel):
    zona_id: str
    latitude_centro: float
    longitude_centro: float
    raio_metros: int
    nome: Optional[str] = None
    total_acidentes: int
    acidentes_graves: int
    causa_mais_frequente: Optional[str] = None
    nivel_risco: str
    recomendacao_melhoria: Optional[str] = None
    validado: bool
    created_at: datetime
