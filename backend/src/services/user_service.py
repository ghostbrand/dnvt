from motor.motor_asyncio import AsyncIOMotorClient
from datetime import datetime, timezone
import uuid
import re
from typing import Optional, List, Dict, Any
from src.utils.auth import hash_password


class UserService:
    _db = None
    
    @classmethod
    def init_db(cls, db):
        cls._db = db
    
    @classmethod
    async def get_by_email(cls, email: str) -> Optional[dict]:
        return await cls._db.usuarios.find_one({"email": email}, {"_id": 0})
    
    @classmethod
    async def get_by_user_id(cls, user_id: str) -> Optional[dict]:
        return await cls._db.usuarios.find_one({"user_id": user_id}, {"_id": 0})
    
    @classmethod
    async def create(cls, nome: str, email: str, senha: str, telefone: str = None, tipo: str = "CIDADAO") -> dict:
        TIPOS_USUARIO = ["ADMIN", "POLICIA", "CIDADAO"]
        user_id = f"user_{uuid.uuid4().hex[:12]}"
        now = datetime.now(timezone.utc)
        
        user_doc = {
            "user_id": user_id,
            "nome": nome,
            "email": email,
            "senha": hash_password(senha),
            "telefone": telefone,
            "tipo": tipo if tipo in TIPOS_USUARIO else "CIDADAO",
            "bilhete_identidade": None,
            "endereco": None,
            "zonas_notificacao": [],
            "alertas_novos_acidentes": True,
            "alertas_sonoros": True,
            "alertas_sms": False,
            "created_at": now.isoformat(),
            "updated_at": now.isoformat()
        }
        
        await cls._db.usuarios.insert_one(user_doc)
        return user_doc
    
    @classmethod
    async def create_google_user(cls, email: str, name: str, picture: str = None, google_id: str = None) -> dict:
        user_id = f"user_{uuid.uuid4().hex[:12]}"
        now = datetime.now(timezone.utc)
        
        user_doc = {
            "user_id": user_id,
            "nome": name or "",
            "email": email,
            "senha": None,
            "telefone": None,
            "tipo": "CIDADAO",
            "bilhete_identidade": None,
            "endereco": None,
            "zonas_notificacao": [],
            "alertas_novos_acidentes": True,
            "alertas_sonoros": True,
            "alertas_sms": False,
            "picture": picture,
            "google_id": google_id,
            "created_at": now.isoformat(),
            "updated_at": now.isoformat()
        }
        
        await cls._db.usuarios.insert_one(user_doc)
        return user_doc
    
    @classmethod
    async def update(cls, user_id: str, update_data: Dict[str, Any]) -> dict:
        # Validate BI format if provided
        if "bilhete_identidade" in update_data:
            bi = update_data["bilhete_identidade"]
            bi_regex = r'^[0-9]{9}[A-Z]{2}[0-9]{3}$'
            if bi and not re.match(bi_regex, bi):
                raise ValueError("Formato de BI inválido. Use: 123456789LA123")
        
        update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
        
        await cls._db.usuarios.update_one(
            {"user_id": user_id}, 
            {"$set": update_data}
        )
        
        return await cls.get_by_user_id(user_id)
