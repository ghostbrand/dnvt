from datetime import datetime, timezone
import uuid
from typing import Optional, List, Dict, Any


MODO_CRIACAO_BO = ["GERADO_SISTEMA", "UPLOAD_MANUAL"]


class BoletimService:
    _db = None
    
    @classmethod
    def init_db(cls, db):
        cls._db = db
    
    @classmethod
    async def create(cls, data: dict, user_id: str) -> dict:
        boletim_id = f"bo_{uuid.uuid4().hex[:12]}"
        numero_processo = data.get("numero_processo") or f"DNVT-{datetime.now().strftime('%Y%m%d')}-{uuid.uuid4().hex[:6].upper()}"
        now = datetime.now(timezone.utc)
        
        boletim_doc = {
            "boletim_id": boletim_id,
            "acidente_id": data["acidente_id"],
            "numero_processo": numero_processo,
            "modo_criacao": data.get("modo_criacao", "GERADO_SISTEMA") if data.get("modo_criacao") in MODO_CRIACAO_BO else "GERADO_SISTEMA",
            "observacoes": data.get("observacoes"),
            "vitimas_info": data.get("vitimas_info", []),
            "veiculos_info": data.get("veiculos_info", []),
            "testemunhas": data.get("testemunhas", []),
            "arquivo_url": None,
            "created_at": now.isoformat(),
            "created_by": user_id
        }
        
        await cls._db.boletins.insert_one(boletim_doc)
        return boletim_doc
    
    @classmethod
    async def get_by_id(cls, boletim_id: str) -> Optional[dict]:
        return await cls._db.boletins.find_one({"boletim_id": boletim_id}, {"_id": 0})
    
    @classmethod
    async def list(cls, limit: int = 100, skip: int = 0) -> List[dict]:
        return await cls._db.boletins.find({}, {"_id": 0}).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    
    @classmethod
    async def upload_file(cls, boletim_id: str, file_data: str, filename: str) -> None:
        await cls._db.boletins.update_one(
            {"boletim_id": boletim_id},
            {"$set": {"arquivo_data": file_data, "arquivo_nome": filename, "modo_criacao": "UPLOAD_MANUAL"}}
        )
