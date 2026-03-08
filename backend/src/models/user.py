from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime


class UserCreate(BaseModel):
    nome: str
    email: EmailStr
    senha: str
    telefone: Optional[str] = None
    tipo: str = "CIDADAO"


class UserLogin(BaseModel):
    email: EmailStr
    senha: str


class UserUpdate(BaseModel):
    nome: Optional[str] = None
    telefone: Optional[str] = None
    bilhete_identidade: Optional[str] = None
    endereco: Optional[str] = None
    zonas_notificacao: Optional[List[str]] = None
    alertas_novos_acidentes: Optional[bool] = None
    alertas_sonoros: Optional[bool] = None
    alertas_sms: Optional[bool] = None


class UserResponse(BaseModel):
    user_id: str
    nome: str
    email: str
    telefone: Optional[str] = None
    tipo: str
    bilhete_identidade: Optional[str] = None
    endereco: Optional[str] = None
    zonas_notificacao: Optional[List[str]] = []
    alertas_novos_acidentes: bool = True
    alertas_sonoros: bool = True
    alertas_sms: bool = False
    created_at: datetime
    updated_at: Optional[datetime] = None


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse
