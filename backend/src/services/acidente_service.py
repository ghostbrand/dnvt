from datetime import datetime, timezone
import uuid
from typing import Optional, List, Dict, Any


GRAVIDADES = ["LEVE", "MODERADO", "GRAVE", "FATAL"]
STATUS_ACIDENTE = ["REPORTADO", "VALIDADO", "EM_ATENDIMENTO", "ENCERRADO"]
ORIGEM_REGISTRO = ["WEB_POLICIA", "MOBILE_CIDADAO"]
TIPOS_ACIDENTE = [
    "COLISAO_FRONTAL", "COLISAO_TRASEIRA", "COLISAO_LATERAL", 
    "CAPOTAMENTO", "ATROPELAMENTO", "CHOQUE_OBSTACULO", "QUEDA_VEICULO", "OUTRO"
]


class AcidenteService:
    _db = None
    
    @classmethod
    def init_db(cls, db):
        cls._db = db
    
    @classmethod
    async def create(cls, data: dict, user_id: str, user_tipo: str) -> dict:
        acidente_id = f"acid_{uuid.uuid4().hex[:12]}"
        now = datetime.now(timezone.utc)
        
        acidente_doc = {
            "acidente_id": acidente_id,
            "latitude": data["latitude"],
            "longitude": data["longitude"],
            "endereco": data.get("endereco"),
            "descricao": data["descricao"],
            "gravidade": data.get("gravidade", "MODERADO") if data.get("gravidade") in GRAVIDADES else "MODERADO",
            "tipo_acidente": data.get("tipo_acidente", "OUTRO") if data.get("tipo_acidente") in TIPOS_ACIDENTE else "OUTRO",
            "causa_principal": data.get("causa_principal"),
            "numero_vitimas": data.get("numero_vitimas", 0),
            "numero_veiculos": data.get("numero_veiculos", 1),
            "status": "REPORTADO",
            "origem_registro": data.get("origem_registro", "WEB_POLICIA") if data.get("origem_registro") in ORIGEM_REGISTRO else "WEB_POLICIA",
            "confirmado_oficialmente": user_tipo in ["ADMIN", "POLICIA"],
            "fotos": data.get("fotos", []),
            "created_at": now.isoformat(),
            "updated_at": now.isoformat(),
            "created_by": user_id
        }
        
        await cls._db.acidentes.insert_one(acidente_doc)
        return acidente_doc
    
    @classmethod
    async def get_by_id(cls, acidente_id: str) -> Optional[dict]:
        return await cls._db.acidentes.find_one({"acidente_id": acidente_id}, {"_id": 0})
    
    @classmethod
    async def list(cls, status: str = None, gravidade: str = None, origem: str = None, limit: int = 100, skip: int = 0) -> List[dict]:
        query = {}
        if status:
            query["status"] = status
        if gravidade:
            query["gravidade"] = gravidade
        if origem:
            query["origem_registro"] = origem
        
        return await cls._db.acidentes.find(query, {"_id": 0}).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    
    @classmethod
    async def list_ativos(cls) -> List[dict]:
        query = {"status": {"$in": ["REPORTADO", "VALIDADO", "EM_ATENDIMENTO"]}}
        return await cls._db.acidentes.find(query, {"_id": 0}).sort("created_at", -1).to_list(500)
    
    @classmethod
    async def update(cls, acidente_id: str, update_data: dict) -> dict:
        update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
        await cls._db.acidentes.update_one({"acidente_id": acidente_id}, {"$set": update_data})
        return await cls.get_by_id(acidente_id)
    
    @classmethod
    async def delete(cls, acidente_id: str) -> bool:
        result = await cls._db.acidentes.delete_one({"acidente_id": acidente_id})
        return result.deleted_count > 0
