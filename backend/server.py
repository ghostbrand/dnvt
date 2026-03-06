from fastapi import FastAPI, APIRouter, HTTPException, Depends, UploadFile, File, Query, Request, WebSocket, WebSocketDisconnect
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.responses import StreamingResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone, timedelta
import jwt
import bcrypt
import httpx
from io import BytesIO
import json
import asyncio

# PDF Generation
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import cm
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, Image
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_JUSTIFY

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# JWT Settings
JWT_SECRET = os.environ.get('JWT_SECRET', 'dnvt_secret_key')
JWT_ALGORITHM = os.environ.get('JWT_ALGORITHM', 'HS256')
JWT_EXPIRY_HOURS = int(os.environ.get('JWT_EXPIRY_HOURS', 24))

app = FastAPI(title="DNVT - Sistema de Gestão de Acidentes")
api_router = APIRouter(prefix="/api")
security = HTTPBearer(auto_error=False)

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# ==================== WEBSOCKET CONNECTION MANAGER ====================

class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []
    
    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)
        logger.info(f"WebSocket connected. Total connections: {len(self.active_connections)}")
    
    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
        logger.info(f"WebSocket disconnected. Total connections: {len(self.active_connections)}")
    
    async def broadcast(self, message: dict):
        """Broadcast message to all connected clients"""
        disconnected = []
        for connection in self.active_connections:
            try:
                await connection.send_json(message)
            except Exception as e:
                logger.error(f"Error broadcasting: {e}")
                disconnected.append(connection)
        
        for conn in disconnected:
            self.disconnect(conn)

manager = ConnectionManager()

# ==================== MODELS ====================

# Enums as strings
TIPOS_USUARIO = ["ADMIN", "POLICIA", "CIDADAO"]
GRAVIDADES = ["LEVE", "MODERADO", "GRAVE", "FATAL"]
STATUS_ACIDENTE = ["REPORTADO", "VALIDADO", "EM_ATENDIMENTO", "ENCERRADO"]
ORIGEM_REGISTRO = ["WEB_POLICIA", "MOBILE_CIDADAO"]
MODO_CRIACAO_BO = ["GERADO_SISTEMA", "UPLOAD_MANUAL"]
TIPO_ASSISTENCIA = ["AMBULANCIA", "POLICIA", "BOMBEIRO"]
STATUS_ASSISTENCIA = ["A_CAMINHO", "NO_LOCAL", "FINALIZADO"]
NIVEL_RISCO = ["BAIXO", "MEDIO", "ALTO"]
CAUSAS_ACIDENTE = [
    "EXCESSO_VELOCIDADE", "ALCOOL", "DISTRACAO", "FALHA_MECANICA", 
    "MAU_TEMPO", "VIA_DANIFICADA", "ULTRAPASSAGEM_INDEVIDA", 
    "DESRESPEITO_SINALIZACAO", "FADIGA", "OUTRA"
]
TIPOS_ACIDENTE = [
    "COLISAO_FRONTAL", "COLISAO_TRASEIRA", "COLISAO_LATERAL", 
    "CAPOTAMENTO", "ATROPELAMENTO", "CHOQUE_OBSTACULO", "QUEDA_VEICULO", "OUTRO"
]

class UserCreate(BaseModel):
    nome: str
    email: EmailStr
    senha: str
    telefone: Optional[str] = None
    tipo: str = "CIDADAO"

class UserLogin(BaseModel):
    email: EmailStr
    senha: str

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

class UserUpdate(BaseModel):
    nome: Optional[str] = None
    telefone: Optional[str] = None
    bilhete_identidade: Optional[str] = None
    endereco: Optional[str] = None
    zonas_notificacao: Optional[List[str]] = None
    alertas_novos_acidentes: Optional[bool] = None
    alertas_sonoros: Optional[bool] = None
    alertas_sms: Optional[bool] = None

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse

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

class ConfiguracaoUpdate(BaseModel):
    google_maps_api_key: Optional[str] = None
    ombala_token: Optional[str] = None
    ombala_sender_name: Optional[str] = None

class ConfiguracaoResponse(BaseModel):
    config_id: str
    google_maps_api_key: Optional[str] = None
    ombala_token: Optional[str] = None
    ombala_sender_name: Optional[str] = None
    ombala_sms_balance: Optional[int] = None
    updated_at: datetime

class SMSRequest(BaseModel):
    phone_number: str
    message: str

# ==================== AUTH HELPERS ====================

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))

def create_token(user_id: str, email: str, tipo: str) -> str:
    payload = {
        "user_id": user_id,
        "email": email,
        "tipo": tipo,
        "exp": datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRY_HOURS)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

async def get_current_user(request: Request, credentials: HTTPAuthorizationCredentials = Depends(security)):
    token = None
    if credentials:
        token = credentials.credentials
    if not token:
        token = request.cookies.get("session_token")
    if not token:
        raise HTTPException(status_code=401, detail="Token não fornecido")
    
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user = await db.usuarios.find_one({"user_id": payload["user_id"]}, {"_id": 0})
        if not user:
            raise HTTPException(status_code=401, detail="Usuário não encontrado")
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expirado")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Token inválido")

async def get_optional_user(request: Request, credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        return await get_current_user(request, credentials)
    except:
        return None

# ==================== AUTH ROUTES ====================

@api_router.post("/auth/register", response_model=TokenResponse)
async def register(user: UserCreate):
    existing = await db.usuarios.find_one({"email": user.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email já cadastrado")
    
    user_id = f"user_{uuid.uuid4().hex[:12]}"
    now = datetime.now(timezone.utc)
    
    user_doc = {
        "user_id": user_id,
        "nome": user.nome,
        "email": user.email,
        "senha": hash_password(user.senha),
        "telefone": user.telefone,
        "tipo": user.tipo if user.tipo in TIPOS_USUARIO else "CIDADAO",
        "created_at": now.isoformat(),
        "updated_at": now.isoformat()
    }
    
    await db.usuarios.insert_one(user_doc)
    
    token = create_token(user_id, user.email, user_doc["tipo"])
    
    return TokenResponse(
        access_token=token,
        user=UserResponse(
            user_id=user_id,
            nome=user.nome,
            email=user.email,
            telefone=user.telefone,
            tipo=user_doc["tipo"],
            created_at=now
        )
    )

@api_router.post("/auth/login", response_model=TokenResponse)
async def login(credentials: UserLogin):
    user = await db.usuarios.find_one({"email": credentials.email}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=401, detail="Credenciais inválidas")
    
    if not verify_password(credentials.senha, user["senha"]):
        raise HTTPException(status_code=401, detail="Credenciais inválidas")
    
    token = create_token(user["user_id"], user["email"], user["tipo"])
    
    created_at = user["created_at"]
    if isinstance(created_at, str):
        created_at = datetime.fromisoformat(created_at)
    
    return TokenResponse(
        access_token=token,
        user=UserResponse(
            user_id=user["user_id"],
            nome=user["nome"],
            email=user["email"],
            telefone=user.get("telefone"),
            tipo=user["tipo"],
            created_at=created_at
        )
    )

@api_router.get("/auth/me", response_model=UserResponse)
async def get_me(current_user: dict = Depends(get_current_user)):
    created_at = current_user["created_at"]
    if isinstance(created_at, str):
        created_at = datetime.fromisoformat(created_at)
    
    updated_at = current_user.get("updated_at")
    if updated_at and isinstance(updated_at, str):
        updated_at = datetime.fromisoformat(updated_at)
    
    return UserResponse(
        user_id=current_user["user_id"],
        nome=current_user["nome"],
        email=current_user["email"],
        telefone=current_user.get("telefone"),
        tipo=current_user["tipo"],
        bilhete_identidade=current_user.get("bilhete_identidade"),
        endereco=current_user.get("endereco"),
        zonas_notificacao=current_user.get("zonas_notificacao", []),
        alertas_novos_acidentes=current_user.get("alertas_novos_acidentes", True),
        alertas_sonoros=current_user.get("alertas_sonoros", True),
        alertas_sms=current_user.get("alertas_sms", False),
        created_at=created_at,
        updated_at=updated_at
    )

@api_router.patch("/usuarios/me", response_model=UserResponse)
async def update_user_profile(update: UserUpdate, current_user: dict = Depends(get_current_user)):
    """Atualiza o perfil do usuário logado"""
    update_data = {k: v for k, v in update.model_dump().items() if v is not None}
    
    if not update_data:
        raise HTTPException(status_code=400, detail="Nenhum dado para atualizar")
    
    # Validação do Bilhete de Identidade (BI) Angolano
    if "bilhete_identidade" in update_data:
        bi = update_data["bilhete_identidade"]
        import re
        bi_regex = r'^[0-9]{9}[A-Z]{2}[0-9]{3}$'
        if bi and not re.match(bi_regex, bi):
            raise HTTPException(status_code=400, detail="Formato de BI inválido. Use: 123456789LA123")
    
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.usuarios.update_one(
        {"user_id": current_user["user_id"]}, 
        {"$set": update_data}
    )
    
    updated_user = await db.usuarios.find_one({"user_id": current_user["user_id"]}, {"_id": 0})
    
    created_at = updated_user["created_at"]
    if isinstance(created_at, str):
        created_at = datetime.fromisoformat(created_at)
    
    updated_at = updated_user.get("updated_at")
    if updated_at and isinstance(updated_at, str):
        updated_at = datetime.fromisoformat(updated_at)
    
    return UserResponse(
        user_id=updated_user["user_id"],
        nome=updated_user["nome"],
        email=updated_user["email"],
        telefone=updated_user.get("telefone"),
        tipo=updated_user["tipo"],
        bilhete_identidade=updated_user.get("bilhete_identidade"),
        endereco=updated_user.get("endereco"),
        zonas_notificacao=updated_user.get("zonas_notificacao", []),
        alertas_novos_acidentes=updated_user.get("alertas_novos_acidentes", True),
        alertas_sonoros=updated_user.get("alertas_sonoros", True),
        alertas_sms=updated_user.get("alertas_sms", False),
        created_at=created_at,
        updated_at=updated_at
    )

@api_router.post("/auth/google/session")
async def google_session(request: Request):
    body = await request.json()
    session_id = body.get("session_id")
    
    if not session_id:
        raise HTTPException(status_code=400, detail="session_id obrigatório")
    
    async with httpx.AsyncClient() as client_http:
        response = await client_http.get(
            "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data",
            headers={"X-Session-ID": session_id}
        )
        
        if response.status_code != 200:
            raise HTTPException(status_code=401, detail="Sessão inválida")
        
        google_data = response.json()
    
    user = await db.usuarios.find_one({"email": google_data["email"]}, {"_id": 0})
    now = datetime.now(timezone.utc)
    
    if not user:
        user_id = f"user_{uuid.uuid4().hex[:12]}"
        user_doc = {
            "user_id": user_id,
            "nome": google_data.get("name", ""),
            "email": google_data["email"],
            "senha": None,
            "telefone": None,
            "tipo": "CIDADAO",
            "picture": google_data.get("picture"),
            "google_id": google_data.get("id"),
            "created_at": now.isoformat(),
            "updated_at": now.isoformat()
        }
        await db.usuarios.insert_one(user_doc)
        user = user_doc
    
    token = create_token(user["user_id"], user["email"], user["tipo"])
    
    created_at = user["created_at"]
    if isinstance(created_at, str):
        created_at = datetime.fromisoformat(created_at)
    
    return TokenResponse(
        access_token=token,
        user=UserResponse(
            user_id=user["user_id"],
            nome=user["nome"],
            email=user["email"],
            telefone=user.get("telefone"),
            tipo=user["tipo"],
            created_at=created_at
        )
    )

# ==================== ACIDENTES ROUTES ====================

@api_router.post("/acidentes", response_model=AcidenteResponse)
async def create_acidente(acidente: AcidenteCreate, current_user: dict = Depends(get_current_user)):
    acidente_id = f"acid_{uuid.uuid4().hex[:12]}"
    now = datetime.now(timezone.utc)
    
    acidente_doc = {
        "acidente_id": acidente_id,
        "latitude": acidente.latitude,
        "longitude": acidente.longitude,
        "endereco": acidente.endereco,
        "descricao": acidente.descricao,
        "gravidade": acidente.gravidade if acidente.gravidade in GRAVIDADES else "MODERADO",
        "tipo_acidente": acidente.tipo_acidente if acidente.tipo_acidente in TIPOS_ACIDENTE else "OUTRO",
        "causa_principal": acidente.causa_principal,
        "numero_vitimas": acidente.numero_vitimas,
        "numero_veiculos": acidente.numero_veiculos,
        "status": "REPORTADO",
        "origem_registro": acidente.origem_registro if acidente.origem_registro in ORIGEM_REGISTRO else "WEB_POLICIA",
        "confirmado_oficialmente": current_user["tipo"] in ["ADMIN", "POLICIA"],
        "fotos": acidente.fotos or [],
        "created_at": now.isoformat(),
        "updated_at": now.isoformat(),
        "created_by": current_user["user_id"]
    }
    
    await db.acidentes.insert_one(acidente_doc)
    
    # Send WebSocket notification
    asyncio.create_task(notify_new_accident(acidente_doc))
    
    return AcidenteResponse(**{**acidente_doc, "created_at": now, "updated_at": now})

@api_router.get("/acidentes", response_model=List[AcidenteResponse])
async def list_acidentes(
    status: Optional[str] = None,
    gravidade: Optional[str] = None,
    origem: Optional[str] = None,
    limit: int = Query(default=100, le=500),
    skip: int = 0
):
    query = {}
    if status:
        query["status"] = status
    if gravidade:
        query["gravidade"] = gravidade
    if origem:
        query["origem_registro"] = origem
    
    acidentes = await db.acidentes.find(query, {"_id": 0}).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    
    result = []
    for a in acidentes:
        created_at = a["created_at"]
        updated_at = a["updated_at"]
        if isinstance(created_at, str):
            created_at = datetime.fromisoformat(created_at)
        if isinstance(updated_at, str):
            updated_at = datetime.fromisoformat(updated_at)
        result.append(AcidenteResponse(**{**a, "created_at": created_at, "updated_at": updated_at}))
    
    return result

@api_router.get("/acidentes/ativos", response_model=List[AcidenteResponse])
async def list_acidentes_ativos():
    query = {"status": {"$in": ["REPORTADO", "VALIDADO", "EM_ATENDIMENTO"]}}
    acidentes = await db.acidentes.find(query, {"_id": 0}).sort("created_at", -1).to_list(500)
    
    result = []
    for a in acidentes:
        created_at = a["created_at"]
        updated_at = a["updated_at"]
        if isinstance(created_at, str):
            created_at = datetime.fromisoformat(created_at)
        if isinstance(updated_at, str):
            updated_at = datetime.fromisoformat(updated_at)
        result.append(AcidenteResponse(**{**a, "created_at": created_at, "updated_at": updated_at}))
    
    return result

@api_router.get("/acidentes/{acidente_id}", response_model=AcidenteResponse)
async def get_acidente(acidente_id: str):
    acidente = await db.acidentes.find_one({"acidente_id": acidente_id}, {"_id": 0})
    if not acidente:
        raise HTTPException(status_code=404, detail="Acidente não encontrado")
    
    created_at = acidente["created_at"]
    updated_at = acidente["updated_at"]
    if isinstance(created_at, str):
        created_at = datetime.fromisoformat(created_at)
    if isinstance(updated_at, str):
        updated_at = datetime.fromisoformat(updated_at)
    
    return AcidenteResponse(**{**acidente, "created_at": created_at, "updated_at": updated_at})

@api_router.patch("/acidentes/{acidente_id}", response_model=AcidenteResponse)
async def update_acidente(acidente_id: str, update: AcidenteUpdate, current_user: dict = Depends(get_current_user)):
    acidente = await db.acidentes.find_one({"acidente_id": acidente_id}, {"_id": 0})
    if not acidente:
        raise HTTPException(status_code=404, detail="Acidente não encontrado")
    
    update_data = {k: v for k, v in update.model_dump().items() if v is not None}
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.acidentes.update_one({"acidente_id": acidente_id}, {"$set": update_data})
    
    updated = await db.acidentes.find_one({"acidente_id": acidente_id}, {"_id": 0})
    created_at = updated["created_at"]
    updated_at = updated["updated_at"]
    if isinstance(created_at, str):
        created_at = datetime.fromisoformat(created_at)
    if isinstance(updated_at, str):
        updated_at = datetime.fromisoformat(updated_at)
    
    return AcidenteResponse(**{**updated, "created_at": created_at, "updated_at": updated_at})

@api_router.delete("/acidentes/{acidente_id}")
async def delete_acidente(acidente_id: str, current_user: dict = Depends(get_current_user)):
    if current_user["tipo"] not in ["ADMIN", "POLICIA"]:
        raise HTTPException(status_code=403, detail="Sem permissão")
    
    result = await db.acidentes.delete_one({"acidente_id": acidente_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Acidente não encontrado")
    
    return {"message": "Acidente removido"}

# ==================== BOLETINS ROUTES ====================

@api_router.post("/boletins", response_model=BoletimResponse)
async def create_boletim(boletim: BoletimCreate, current_user: dict = Depends(get_current_user)):
    acidente = await db.acidentes.find_one({"acidente_id": boletim.acidente_id}, {"_id": 0})
    if not acidente:
        raise HTTPException(status_code=404, detail="Acidente não encontrado")
    
    boletim_id = f"bo_{uuid.uuid4().hex[:12]}"
    numero_processo = boletim.numero_processo or f"DNVT-{datetime.now().strftime('%Y%m%d')}-{uuid.uuid4().hex[:6].upper()}"
    now = datetime.now(timezone.utc)
    
    boletim_doc = {
        "boletim_id": boletim_id,
        "acidente_id": boletim.acidente_id,
        "numero_processo": numero_processo,
        "modo_criacao": boletim.modo_criacao if boletim.modo_criacao in MODO_CRIACAO_BO else "GERADO_SISTEMA",
        "observacoes": boletim.observacoes,
        "vitimas_info": boletim.vitimas_info or [],
        "veiculos_info": boletim.veiculos_info or [],
        "testemunhas": boletim.testemunhas or [],
        "arquivo_url": None,
        "created_at": now.isoformat(),
        "created_by": current_user["user_id"]
    }
    
    await db.boletins.insert_one(boletim_doc)
    
    return BoletimResponse(**{**boletim_doc, "created_at": now})

@api_router.get("/boletins", response_model=List[BoletimResponse])
async def list_boletins(limit: int = Query(default=100, le=500), skip: int = 0):
    boletins = await db.boletins.find({}, {"_id": 0}).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    
    result = []
    for b in boletins:
        created_at = b["created_at"]
        if isinstance(created_at, str):
            created_at = datetime.fromisoformat(created_at)
        result.append(BoletimResponse(**{**b, "created_at": created_at}))
    
    return result

@api_router.get("/boletins/{boletim_id}", response_model=BoletimResponse)
async def get_boletim(boletim_id: str):
    boletim = await db.boletins.find_one({"boletim_id": boletim_id}, {"_id": 0})
    if not boletim:
        raise HTTPException(status_code=404, detail="Boletim não encontrado")
    
    created_at = boletim["created_at"]
    if isinstance(created_at, str):
        created_at = datetime.fromisoformat(created_at)
    
    return BoletimResponse(**{**boletim, "created_at": created_at})

@api_router.post("/boletins/{boletim_id}/upload")
async def upload_boletim_file(boletim_id: str, file: UploadFile = File(...), current_user: dict = Depends(get_current_user)):
    boletim = await db.boletins.find_one({"boletim_id": boletim_id}, {"_id": 0})
    if not boletim:
        raise HTTPException(status_code=404, detail="Boletim não encontrado")
    
    # Store file content as base64 in DB (for simplicity)
    content = await file.read()
    import base64
    file_data = base64.b64encode(content).decode('utf-8')
    
    await db.boletins.update_one(
        {"boletim_id": boletim_id},
        {"$set": {"arquivo_data": file_data, "arquivo_nome": file.filename, "modo_criacao": "UPLOAD_MANUAL"}}
    )
    
    return {"message": "Arquivo enviado com sucesso"}

# ==================== PDF GENERATION ====================

def generate_boletim_pdf(boletim: dict, acidente: dict, user: dict) -> BytesIO:
    """Generate PDF for Boletim de Ocorrência"""
    buffer = BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4, topMargin=1.5*cm, bottomMargin=1.5*cm)
    
    styles = getSampleStyleSheet()
    styles.add(ParagraphStyle(name='TitleCenter', parent=styles['Title'], alignment=TA_CENTER, fontSize=16, spaceAfter=20))
    styles.add(ParagraphStyle(name='SubTitle', parent=styles['Normal'], fontSize=12, spaceAfter=10, fontName='Helvetica-Bold'))
    styles.add(ParagraphStyle(name='BodyTextCustom', parent=styles['Normal'], fontSize=10, alignment=TA_JUSTIFY, spaceAfter=8))
    styles.add(ParagraphStyle(name='SmallText', parent=styles['Normal'], fontSize=8, textColor=colors.gray))
    
    elements = []
    
    # Header
    elements.append(Paragraph("REPÚBLICA DE ANGOLA", styles['TitleCenter']))
    elements.append(Paragraph("DIREÇÃO NACIONAL DE VIAÇÃO E TRÂNSITO", styles['TitleCenter']))
    elements.append(Paragraph("BOLETIM DE OCORRÊNCIA", styles['TitleCenter']))
    elements.append(Spacer(1, 20))
    
    # Process number
    elements.append(Paragraph(f"<b>Nº Processo:</b> {boletim.get('numero_processo', 'N/A')}", styles['SubTitle']))
    elements.append(Spacer(1, 15))
    
    # Accident info
    elements.append(Paragraph("DADOS DO ACIDENTE", styles['SubTitle']))
    
    acidente_data = [
        ["Data/Hora:", datetime.fromisoformat(acidente.get('created_at', '')).strftime('%d/%m/%Y %H:%M') if acidente.get('created_at') else 'N/A'],
        ["Tipo:", acidente.get('tipo_acidente', 'N/A').replace('_', ' ')],
        ["Gravidade:", acidente.get('gravidade', 'N/A')],
        ["Coordenadas:", f"{acidente.get('latitude', 0):.6f}, {acidente.get('longitude', 0):.6f}"],
        ["Endereço:", acidente.get('endereco', 'N/A') or 'N/A'],
        ["Causa Principal:", acidente.get('causa_principal', 'N/A').replace('_', ' ') if acidente.get('causa_principal') else 'N/A'],
        ["Nº Veículos:", str(acidente.get('numero_veiculos', 0))],
        ["Nº Vítimas:", str(acidente.get('numero_vitimas', 0))],
    ]
    
    table = Table(acidente_data, colWidths=[4*cm, 12*cm])
    table.setStyle(TableStyle([
        ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 10),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ('TOPPADDING', (0, 0), (-1, -1), 8),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.lightgrey),
        ('BACKGROUND', (0, 0), (0, -1), colors.Color(0.95, 0.95, 0.95)),
    ]))
    elements.append(table)
    elements.append(Spacer(1, 15))
    
    # Description
    elements.append(Paragraph("DESCRIÇÃO DO ACIDENTE", styles['SubTitle']))
    elements.append(Paragraph(acidente.get('descricao', 'Sem descrição'), styles['BodyTextCustom']))
    elements.append(Spacer(1, 15))
    
    # Victims info if available
    vitimas = boletim.get('vitimas_info', [])
    if vitimas:
        elements.append(Paragraph("INFORMAÇÕES DAS VÍTIMAS", styles['SubTitle']))
        for i, vitima in enumerate(vitimas, 1):
            elements.append(Paragraph(f"{i}. {vitima.get('nome', 'N/A')} - {vitima.get('estado', 'N/A')}", styles['BodyTextCustom']))
        elements.append(Spacer(1, 15))
    
    # Vehicles info if available
    veiculos = boletim.get('veiculos_info', [])
    if veiculos:
        elements.append(Paragraph("INFORMAÇÕES DOS VEÍCULOS", styles['SubTitle']))
        for i, veiculo in enumerate(veiculos, 1):
            elements.append(Paragraph(f"{i}. {veiculo.get('marca', 'N/A')} - Matrícula: {veiculo.get('matricula', 'N/A')}", styles['BodyTextCustom']))
        elements.append(Spacer(1, 15))
    
    # Observations
    if boletim.get('observacoes'):
        elements.append(Paragraph("OBSERVAÇÕES", styles['SubTitle']))
        elements.append(Paragraph(boletim.get('observacoes', ''), styles['BodyTextCustom']))
        elements.append(Spacer(1, 15))
    
    # Footer
    elements.append(Spacer(1, 30))
    elements.append(Paragraph(f"Documento gerado em: {datetime.now().strftime('%d/%m/%Y %H:%M')}", styles['SmallText']))
    elements.append(Paragraph(f"Responsável: {user.get('nome', 'N/A')}", styles['SmallText']))
    elements.append(Paragraph(f"ID do Boletim: {boletim.get('boletim_id', 'N/A')}", styles['SmallText']))
    
    # Signature area
    elements.append(Spacer(1, 40))
    sig_data = [
        ["_" * 40, "_" * 40],
        ["Agente Responsável", "Testemunha"],
    ]
    sig_table = Table(sig_data, colWidths=[8*cm, 8*cm])
    sig_table.setStyle(TableStyle([
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('FONTSIZE', (0, 0), (-1, -1), 9),
        ('TOPPADDING', (0, 1), (-1, 1), 5),
    ]))
    elements.append(sig_table)
    
    doc.build(elements)
    buffer.seek(0)
    return buffer

@api_router.get("/boletins/{boletim_id}/pdf")
async def generate_boletim_pdf_endpoint(boletim_id: str, current_user: dict = Depends(get_current_user)):
    """Generate PDF for a Boletim de Ocorrência"""
    boletim = await db.boletins.find_one({"boletim_id": boletim_id}, {"_id": 0})
    if not boletim:
        raise HTTPException(status_code=404, detail="Boletim não encontrado")
    
    acidente = await db.acidentes.find_one({"acidente_id": boletim["acidente_id"]}, {"_id": 0})
    if not acidente:
        raise HTTPException(status_code=404, detail="Acidente associado não encontrado")
    
    pdf_buffer = generate_boletim_pdf(boletim, acidente, current_user)
    
    filename = f"boletim_{boletim['numero_processo'].replace('-', '_')}.pdf"
    
    return StreamingResponse(
        pdf_buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )

# ==================== ASSISTENCIAS ROUTES ====================

@api_router.post("/assistencias", response_model=AssistenciaResponse)
async def create_assistencia(assistencia: AssistenciaCreate, current_user: dict = Depends(get_current_user)):
    if current_user["tipo"] not in ["ADMIN", "POLICIA"]:
        raise HTTPException(status_code=403, detail="Sem permissão")
    
    acidente = await db.acidentes.find_one({"acidente_id": assistencia.acidente_id}, {"_id": 0})
    if not acidente:
        raise HTTPException(status_code=404, detail="Acidente não encontrado")
    
    assistencia_id = f"assist_{uuid.uuid4().hex[:12]}"
    now = datetime.now(timezone.utc)
    
    assistencia_doc = {
        "assistencia_id": assistencia_id,
        "acidente_id": assistencia.acidente_id,
        "tipo": assistencia.tipo if assistencia.tipo in TIPO_ASSISTENCIA else "POLICIA",
        "status": "A_CAMINHO",
        "latitude_atual": assistencia.latitude_atual or acidente["latitude"],
        "longitude_atual": assistencia.longitude_atual or acidente["longitude"],
        "hora_inicio": now.isoformat(),
        "hora_fim": None
    }
    
    await db.assistencias.insert_one(assistencia_doc)
    
    # Update accident status
    await db.acidentes.update_one(
        {"acidente_id": assistencia.acidente_id},
        {"$set": {"status": "EM_ATENDIMENTO", "updated_at": now.isoformat()}}
    )
    
    # Send WebSocket notification
    asyncio.create_task(notify_assistance_update(assistencia_doc, assistencia.acidente_id))
    
    return AssistenciaResponse(**{**assistencia_doc, "hora_inicio": now})

@api_router.get("/assistencias", response_model=List[AssistenciaResponse])
async def list_assistencias(status: Optional[str] = None, acidente_id: Optional[str] = None):
    query = {}
    if status:
        query["status"] = status
    if acidente_id:
        query["acidente_id"] = acidente_id
    
    assistencias = await db.assistencias.find(query, {"_id": 0}).sort("hora_inicio", -1).to_list(500)
    
    result = []
    for a in assistencias:
        hora_inicio = a["hora_inicio"]
        hora_fim = a.get("hora_fim")
        if isinstance(hora_inicio, str):
            hora_inicio = datetime.fromisoformat(hora_inicio)
        if hora_fim and isinstance(hora_fim, str):
            hora_fim = datetime.fromisoformat(hora_fim)
        result.append(AssistenciaResponse(**{**a, "hora_inicio": hora_inicio, "hora_fim": hora_fim}))
    
    return result

@api_router.patch("/assistencias/{assistencia_id}", response_model=AssistenciaResponse)
async def update_assistencia(assistencia_id: str, update: AssistenciaUpdate, current_user: dict = Depends(get_current_user)):
    assistencia = await db.assistencias.find_one({"assistencia_id": assistencia_id}, {"_id": 0})
    if not assistencia:
        raise HTTPException(status_code=404, detail="Assistência não encontrada")
    
    update_data = {k: v for k, v in update.model_dump().items() if v is not None}
    
    if update.status == "FINALIZADO":
        update_data["hora_fim"] = datetime.now(timezone.utc).isoformat()
    
    await db.assistencias.update_one({"assistencia_id": assistencia_id}, {"$set": update_data})
    
    updated = await db.assistencias.find_one({"assistencia_id": assistencia_id}, {"_id": 0})
    hora_inicio = updated["hora_inicio"]
    hora_fim = updated.get("hora_fim")
    if isinstance(hora_inicio, str):
        hora_inicio = datetime.fromisoformat(hora_inicio)
    if hora_fim and isinstance(hora_fim, str):
        hora_fim = datetime.fromisoformat(hora_fim)
    
    # Send WebSocket notification
    asyncio.create_task(notify_assistance_update(updated, assistencia["acidente_id"]))
    
    return AssistenciaResponse(**{**updated, "hora_inicio": hora_inicio, "hora_fim": hora_fim})

# ==================== ZONAS CRITICAS ROUTES ====================

@api_router.post("/zonas-criticas", response_model=ZonaCriticaResponse)
async def create_zona_critica(zona: ZonaCriticaCreate, current_user: dict = Depends(get_current_user)):
    if current_user["tipo"] not in ["ADMIN", "POLICIA"]:
        raise HTTPException(status_code=403, detail="Sem permissão")
    
    zona_id = f"zona_{uuid.uuid4().hex[:12]}"
    now = datetime.now(timezone.utc)
    
    zona_doc = {
        "zona_id": zona_id,
        "latitude_centro": zona.latitude_centro,
        "longitude_centro": zona.longitude_centro,
        "raio_metros": zona.raio_metros,
        "nome": zona.nome,
        "total_acidentes": 0,
        "acidentes_graves": 0,
        "causa_mais_frequente": None,
        "nivel_risco": "BAIXO",
        "recomendacao_melhoria": None,
        "validado": False,
        "created_at": now.isoformat()
    }
    
    await db.zonas_criticas.insert_one(zona_doc)
    
    return ZonaCriticaResponse(**{**zona_doc, "created_at": now})

@api_router.get("/zonas-criticas", response_model=List[ZonaCriticaResponse])
async def list_zonas_criticas(validado: Optional[bool] = None):
    query = {}
    if validado is not None:
        query["validado"] = validado
    
    zonas = await db.zonas_criticas.find(query, {"_id": 0}).to_list(500)
    
    result = []
    for z in zonas:
        created_at = z["created_at"]
        if isinstance(created_at, str):
            created_at = datetime.fromisoformat(created_at)
        result.append(ZonaCriticaResponse(**{**z, "created_at": created_at}))
    
    return result

@api_router.patch("/zonas-criticas/{zona_id}/validar")
async def validar_zona_critica(zona_id: str, current_user: dict = Depends(get_current_user)):
    if current_user["tipo"] != "ADMIN":
        raise HTTPException(status_code=403, detail="Apenas administradores podem validar zonas")
    
    result = await db.zonas_criticas.update_one(
        {"zona_id": zona_id},
        {"$set": {"validado": True}}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Zona não encontrada")
    
    return {"message": "Zona validada com sucesso"}

@api_router.get("/zonas-criticas/calcular")
async def calcular_zonas_criticas():
    """Calcula automaticamente zonas críticas baseado na concentração de acidentes"""
    pipeline = [
        {
            "$group": {
                "_id": {
                    "lat": {"$round": ["$latitude", 2]},
                    "lng": {"$round": ["$longitude", 2]}
                },
                "total": {"$sum": 1},
                "graves": {"$sum": {"$cond": [{"$in": ["$gravidade", ["GRAVE", "FATAL"]]}, 1, 0]}},
                "causas": {"$push": "$causa_principal"}
            }
        },
        {"$match": {"total": {"$gte": 3}}},
        {"$sort": {"total": -1}},
        {"$limit": 20}
    ]
    
    clusters = await db.acidentes.aggregate(pipeline).to_list(20)
    
    zonas_calculadas = []
    for cluster in clusters:
        causas = [c for c in cluster["causas"] if c]
        causa_freq = max(set(causas), key=causas.count) if causas else None
        
        nivel_risco = "BAIXO"
        if cluster["total"] >= 10 or cluster["graves"] >= 3:
            nivel_risco = "ALTO"
        elif cluster["total"] >= 5 or cluster["graves"] >= 2:
            nivel_risco = "MEDIO"
        
        recomendacao = None
        if causa_freq == "EXCESSO_VELOCIDADE":
            recomendacao = "Instalação de redutores de velocidade e radares"
        elif causa_freq == "VIA_DANIFICADA":
            recomendacao = "Reparação urgente do pavimento"
        elif causa_freq == "DESRESPEITO_SINALIZACAO":
            recomendacao = "Reforço da sinalização e fiscalização"
        elif causa_freq == "MAU_TEMPO":
            recomendacao = "Melhorar drenagem e iluminação"
        
        zonas_calculadas.append({
            "latitude_centro": cluster["_id"]["lat"],
            "longitude_centro": cluster["_id"]["lng"],
            "total_acidentes": cluster["total"],
            "acidentes_graves": cluster["graves"],
            "causa_mais_frequente": causa_freq,
            "nivel_risco": nivel_risco,
            "recomendacao_melhoria": recomendacao
        })
    
    return zonas_calculadas

# ==================== ESTATISTICAS ROUTES ====================

@api_router.get("/estatisticas/resumo")
async def get_estatisticas_resumo():
    """Retorna estatísticas gerais do sistema"""
    now = datetime.now(timezone.utc)
    hoje_inicio = now.replace(hour=0, minute=0, second=0, microsecond=0).isoformat()
    mes_inicio = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0).isoformat()
    
    total_acidentes = await db.acidentes.count_documents({})
    acidentes_hoje = await db.acidentes.count_documents({"created_at": {"$gte": hoje_inicio}})
    acidentes_mes = await db.acidentes.count_documents({"created_at": {"$gte": mes_inicio}})
    
    acidentes_ativos = await db.acidentes.count_documents({"status": {"$in": ["REPORTADO", "VALIDADO", "EM_ATENDIMENTO"]}})
    
    acidentes_graves = await db.acidentes.count_documents({"gravidade": {"$in": ["GRAVE", "FATAL"]}})
    
    assistencias_ativas = await db.assistencias.count_documents({"status": {"$in": ["A_CAMINHO", "NO_LOCAL"]}})
    
    zonas_criticas = await db.zonas_criticas.count_documents({"nivel_risco": "ALTO"})
    
    # Estatísticas por gravidade
    gravidade_stats = await db.acidentes.aggregate([
        {"$group": {"_id": "$gravidade", "count": {"$sum": 1}}}
    ]).to_list(10)
    
    # Estatísticas por causa
    causa_stats = await db.acidentes.aggregate([
        {"$match": {"causa_principal": {"$ne": None}}},
        {"$group": {"_id": "$causa_principal", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}},
        {"$limit": 5}
    ]).to_list(5)
    
    # Estatísticas por tipo
    tipo_stats = await db.acidentes.aggregate([
        {"$group": {"_id": "$tipo_acidente", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}}
    ]).to_list(10)
    
    return {
        "total_acidentes": total_acidentes,
        "acidentes_hoje": acidentes_hoje,
        "acidentes_mes": acidentes_mes,
        "acidentes_ativos": acidentes_ativos,
        "acidentes_graves": acidentes_graves,
        "assistencias_ativas": assistencias_ativas,
        "zonas_criticas_alto_risco": zonas_criticas,
        "por_gravidade": {item["_id"]: item["count"] for item in gravidade_stats},
        "por_causa": {item["_id"]: item["count"] for item in causa_stats},
        "por_tipo": {item["_id"]: item["count"] for item in tipo_stats}
    }

@api_router.get("/estatisticas/mensal")
async def get_estatisticas_mensal(ano: int = None, mes: int = None):
    """Retorna estatísticas mensais"""
    now = datetime.now(timezone.utc)
    ano = ano or now.year
    mes = mes or now.month
    
    inicio = datetime(ano, mes, 1, tzinfo=timezone.utc).isoformat()
    if mes == 12:
        fim = datetime(ano + 1, 1, 1, tzinfo=timezone.utc).isoformat()
    else:
        fim = datetime(ano, mes + 1, 1, tzinfo=timezone.utc).isoformat()
    
    pipeline = [
        {"$match": {"created_at": {"$gte": inicio, "$lt": fim}}},
        {"$group": {
            "_id": None,
            "total": {"$sum": 1},
            "graves": {"$sum": {"$cond": [{"$eq": ["$gravidade", "GRAVE"]}, 1, 0]}},
            "fatais": {"$sum": {"$cond": [{"$eq": ["$gravidade", "FATAL"]}, 1, 0]}},
            "vitimas": {"$sum": "$numero_vitimas"}
        }}
    ]
    
    result = await db.acidentes.aggregate(pipeline).to_list(1)
    
    if not result:
        return {
            "ano": ano,
            "mes": mes,
            "total_acidentes": 0,
            "acidentes_graves": 0,
            "acidentes_fatais": 0,
            "total_vitimas": 0
        }
    
    return {
        "ano": ano,
        "mes": mes,
        "total_acidentes": result[0]["total"],
        "acidentes_graves": result[0]["graves"],
        "acidentes_fatais": result[0]["fatais"],
        "total_vitimas": result[0]["vitimas"]
    }

@api_router.get("/estatisticas/por-hora")
async def get_estatisticas_por_hora():
    """Retorna distribuição de acidentes por hora do dia"""
    pipeline = [
        {"$addFields": {
            "hora": {"$hour": {"$dateFromString": {"dateString": "$created_at"}}}
        }},
        {"$group": {"_id": "$hora", "count": {"$sum": 1}}},
        {"$sort": {"_id": 1}}
    ]
    
    result = await db.acidentes.aggregate(pipeline).to_list(24)
    
    # Fill missing hours with 0
    hours_data = {i: 0 for i in range(24)}
    for item in result:
        if item["_id"] is not None:
            hours_data[item["_id"]] = item["count"]
    
    return [{"hora": h, "acidentes": c} for h, c in hours_data.items()]

@api_router.get("/estatisticas/por-dia-semana")
async def get_estatisticas_por_dia_semana():
    """Retorna distribuição de acidentes por dia da semana"""
    pipeline = [
        {"$addFields": {
            "dia_semana": {"$dayOfWeek": {"$dateFromString": {"dateString": "$created_at"}}}
        }},
        {"$group": {"_id": "$dia_semana", "count": {"$sum": 1}}},
        {"$sort": {"_id": 1}}
    ]
    
    result = await db.acidentes.aggregate(pipeline).to_list(7)
    
    dias = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"]
    dias_data = {i+1: {"dia": dias[i], "acidentes": 0} for i in range(7)}
    
    for item in result:
        if item["_id"] is not None:
            dias_data[item["_id"]]["acidentes"] = item["count"]
    
    return list(dias_data.values())

# ==================== CONFIGURACOES ROUTES ====================

@api_router.get("/configuracoes", response_model=ConfiguracaoResponse)
async def get_configuracoes(current_user: dict = Depends(get_current_user)):
    if current_user["tipo"] != "ADMIN":
        raise HTTPException(status_code=403, detail="Apenas administradores podem ver configurações")
    
    config = await db.configuracoes.find_one({}, {"_id": 0})
    
    if not config:
        config = {
            "config_id": f"config_{uuid.uuid4().hex[:8]}",
            "google_maps_api_key": None,
            "ombala_token": None,
            "ombala_sender_name": None,
            "ombala_sms_balance": None,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }
        await db.configuracoes.insert_one(config)
    
    # Check Ombala balance if token exists
    if config.get("ombala_token"):
        try:
            async with httpx.AsyncClient() as client_http:
                response = await client_http.get(
                    "https://api.useombala.ao/v1/credits",
                    headers={"Authorization": f"Token {config['ombala_token']}"}
                )
                if response.status_code == 200:
                    balance_data = response.json()
                    config["ombala_sms_balance"] = balance_data.get("balance", balance_data.get("credits", 0))
        except Exception as e:
            logger.error(f"Error fetching Ombala balance: {e}")
    
    updated_at = config["updated_at"]
    if isinstance(updated_at, str):
        updated_at = datetime.fromisoformat(updated_at)
    
    return ConfiguracaoResponse(**{**config, "updated_at": updated_at})

@api_router.patch("/configuracoes", response_model=ConfiguracaoResponse)
async def update_configuracoes(update: ConfiguracaoUpdate, current_user: dict = Depends(get_current_user)):
    if current_user["tipo"] != "ADMIN":
        raise HTTPException(status_code=403, detail="Apenas administradores podem alterar configurações")
    
    config = await db.configuracoes.find_one({}, {"_id": 0})
    
    if not config:
        config = {
            "config_id": f"config_{uuid.uuid4().hex[:8]}",
            "google_maps_api_key": None,
            "ombala_token": None,
            "ombala_sender_name": None,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }
        await db.configuracoes.insert_one(config)
    
    update_data = {k: v for k, v in update.model_dump().items() if v is not None}
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.configuracoes.update_one({}, {"$set": update_data})
    
    updated = await db.configuracoes.find_one({}, {"_id": 0})
    
    # Check Ombala balance
    if updated.get("ombala_token"):
        try:
            async with httpx.AsyncClient() as client_http:
                response = await client_http.get(
                    "https://api.useombala.ao/v1/credits",
                    headers={"Authorization": f"Token {updated['ombala_token']}"}
                )
                if response.status_code == 200:
                    balance_data = response.json()
                    updated["ombala_sms_balance"] = balance_data.get("balance", balance_data.get("credits", 0))
        except Exception as e:
            logger.error(f"Error fetching Ombala balance: {e}")
    
    updated_at = updated["updated_at"]
    if isinstance(updated_at, str):
        updated_at = datetime.fromisoformat(updated_at)
    
    return ConfiguracaoResponse(**{**updated, "updated_at": updated_at})

@api_router.get("/configuracoes/google-maps-key")
async def get_google_maps_key():
    """Public endpoint to get Google Maps API key for frontend"""
    config = await db.configuracoes.find_one({}, {"_id": 0, "google_maps_api_key": 1})
    return {"api_key": config.get("google_maps_api_key") if config else None}

# ==================== SMS ROUTES ====================

@api_router.post("/sms/enviar")
async def enviar_sms(sms: SMSRequest, current_user: dict = Depends(get_current_user)):
    """Envia SMS usando a API Ombala"""
    config = await db.configuracoes.find_one({}, {"_id": 0})
    
    if not config or not config.get("ombala_token") or not config.get("ombala_sender_name"):
        raise HTTPException(status_code=400, detail="Configurações do Ombala não definidas")
    
    try:
        async with httpx.AsyncClient() as client_http:
            response = await client_http.post(
                "https://api.useombala.ao/v1/messages",
                headers={
                    "Authorization": f"Token {config['ombala_token']}",
                    "Content-Type": "application/json"
                },
                json={
                    "message": sms.message,
                    "from": config["ombala_sender_name"],
                    "to": sms.phone_number
                }
            )
            
            if response.status_code == 201:
                return {"success": True, "message": "SMS enviado com sucesso"}
            else:
                return {"success": False, "error": response.text}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao enviar SMS: {str(e)}")

@api_router.get("/sms/saldo")
async def get_sms_saldo(current_user: dict = Depends(get_current_user)):
    """Retorna saldo de SMS disponível"""
    config = await db.configuracoes.find_one({}, {"_id": 0})
    
    if not config or not config.get("ombala_token"):
        return {"saldo": None, "message": "Token Ombala não configurado"}
    
    try:
        async with httpx.AsyncClient() as client_http:
            response = await client_http.get(
                "https://api.useombala.ao/v1/credits",
                headers={"Authorization": f"Token {config['ombala_token']}"}
            )
            
            if response.status_code == 200:
                data = response.json()
                return {"saldo": data.get("balance", data.get("credits", 0))}
            else:
                return {"saldo": None, "error": response.text}
    except Exception as e:
        return {"saldo": None, "error": str(e)}

# ==================== ROTAS ALERTAS ====================

@api_router.post("/rotas/verificar-acidentes")
async def verificar_acidentes_rota(
    lat_origem: float,
    lng_origem: float,
    lat_destino: float,
    lng_destino: float,
    current_user: dict = Depends(get_optional_user)
):
    """Verifica se há acidentes ativos na rota entre origem e destino"""
    # Simple bounding box check
    min_lat = min(lat_origem, lat_destino) - 0.01
    max_lat = max(lat_origem, lat_destino) + 0.01
    min_lng = min(lng_origem, lng_destino) - 0.01
    max_lng = max(lng_origem, lng_destino) + 0.01
    
    acidentes_na_rota = await db.acidentes.find({
        "status": {"$in": ["REPORTADO", "VALIDADO", "EM_ATENDIMENTO"]},
        "latitude": {"$gte": min_lat, "$lte": max_lat},
        "longitude": {"$gte": min_lng, "$lte": max_lng}
    }, {"_id": 0}).to_list(100)
    
    # Log the route check
    if current_user:
        await db.rotas_alertas.insert_one({
            "id_alerta": f"alerta_{uuid.uuid4().hex[:12]}",
            "user_id": current_user["user_id"],
            "latitude_origem": lat_origem,
            "longitude_origem": lng_origem,
            "latitude_destino": lat_destino,
            "longitude_destino": lng_destino,
            "possui_acidente_na_rota": len(acidentes_na_rota) > 0,
            "data_consulta": datetime.now(timezone.utc).isoformat()
        })
    
    return {
        "possui_acidentes": len(acidentes_na_rota) > 0,
        "total_acidentes": len(acidentes_na_rota),
        "acidentes": acidentes_na_rota
    }

# ==================== HEALTH CHECK ====================

@api_router.get("/")
async def root():
    return {"message": "DNVT - Sistema de Gestão de Acidentes de Trânsito", "status": "online"}

@api_router.get("/health")
async def health_check():
    return {"status": "healthy", "timestamp": datetime.now(timezone.utc).isoformat()}

# ==================== WEBSOCKET ENDPOINTS ====================

@app.websocket("/ws/notifications")
async def websocket_notifications(websocket: WebSocket):
    """WebSocket endpoint for real-time notifications"""
    await manager.connect(websocket)
    try:
        while True:
            # Keep connection alive and listen for messages
            data = await websocket.receive_text()
            # Can handle incoming messages if needed
            logger.info(f"Received WebSocket message: {data}")
    except WebSocketDisconnect:
        manager.disconnect(websocket)
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
        manager.disconnect(websocket)

async def notify_new_accident(acidente: dict):
    """Send notification when new accident is created"""
    message = {
        "type": "NEW_ACCIDENT",
        "data": {
            "acidente_id": acidente["acidente_id"],
            "tipo_acidente": acidente["tipo_acidente"],
            "gravidade": acidente["gravidade"],
            "latitude": acidente["latitude"],
            "longitude": acidente["longitude"],
            "descricao": acidente["descricao"][:100] if acidente.get("descricao") else "",
            "created_at": acidente["created_at"]
        },
        "timestamp": datetime.now(timezone.utc).isoformat()
    }
    await manager.broadcast(message)

async def notify_assistance_update(assistencia: dict, acidente_id: str):
    """Send notification when assistance status changes"""
    message = {
        "type": "ASSISTANCE_UPDATE",
        "data": {
            "assistencia_id": assistencia["assistencia_id"],
            "acidente_id": acidente_id,
            "tipo": assistencia["tipo"],
            "status": assistencia["status"],
            "latitude_atual": assistencia.get("latitude_atual"),
            "longitude_atual": assistencia.get("longitude_atual")
        },
        "timestamp": datetime.now(timezone.utc).isoformat()
    }
    await manager.broadcast(message)

# Include router
app.include_router(api_router)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
