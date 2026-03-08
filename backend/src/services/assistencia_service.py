from datetime import datetime, timezone
import uuid
from typing import Optional, List


TIPO_ASSISTENCIA = ["AMBULANCIA", "POLICIA", "BOMBEIRO"]
STATUS_ASSISTENCIA = ["A_CAMINHO", "NO_LOCAL", "FINALIZADO"]


class AssistenciaService:
    _db = None
    
    @classmethod
    def init_db(cls, db):
        cls._db = db
    
    @classmethod
    async def create(cls, data: dict, acidente: dict) -> dict:
        assistencia_id = f"assist_{uuid.uuid4().hex[:12]}"
        now = datetime.now(timezone.utc)
        
        assistencia_doc = {
            "assistencia_id": assistencia_id,
            "acidente_id": data["acidente_id"],
            "tipo": data["tipo"] if data["tipo"] in TIPO_ASSISTENCIA else "POLICIA",
            "status": "A_CAMINHO",
            "latitude_atual": data.get("latitude_atual") or acidente["latitude"],
            "longitude_atual": data.get("longitude_atual") or acidente["longitude"],
            "hora_inicio": now.isoformat(),
            "hora_fim": None
        }
        
        await cls._db.assistencias.insert_one(assistencia_doc)
        
        # Update accident status
        await cls._db.acidentes.update_one(
            {"acidente_id": data["acidente_id"]},
            {"$set": {"status": "EM_ATENDIMENTO", "updated_at": now.isoformat()}}
        )
        
        return assistencia_doc
    
    @classmethod
    async def get_by_id(cls, assistencia_id: str) -> Optional[dict]:
        return await cls._db.assistencias.find_one({"assistencia_id": assistencia_id}, {"_id": 0})
    
    @classmethod
    async def list(cls, status: str = None, acidente_id: str = None) -> List[dict]:
        query = {}
        if status:
            query["status"] = status
        if acidente_id:
            query["acidente_id"] = acidente_id
        
        return await cls._db.assistencias.find(query, {"_id": 0}).sort("hora_inicio", -1).to_list(500)
    
    @classmethod
    async def update(cls, assistencia_id: str, update_data: dict) -> dict:
        if update_data.get("status") == "FINALIZADO":
            update_data["hora_fim"] = datetime.now(timezone.utc).isoformat()
        
        await cls._db.assistencias.update_one({"assistencia_id": assistencia_id}, {"$set": update_data})
        return await cls.get_by_id(assistencia_id)
