from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime


class BoletimCreate(BaseModel):
    acidente_id: str
    numero_processo: Optional[str] = None
    modo_criacao: str = "GERADO_SISTEMA"
    observacoes: Optional[str] = None
    vitimas_info: Optional[List[Dict[str, Any]]] = []
    veiculos_info: Optional[List[Dict[str, Any]]] = []
    testemunhas: Optional[List[Dict[str, Any]]] = []


class BoletimResponse(BaseModel):
    boletim_id: str
    acidente_id: str
    numero_processo: str
    modo_criacao: str
    observacoes: Optional[str] = None
    vitimas_info: List[Dict[str, Any]]
    veiculos_info: List[Dict[str, Any]]
    testemunhas: List[Dict[str, Any]]
    arquivo_url: Optional[str] = None
    created_at: datetime
    created_by: Optional[str] = None
