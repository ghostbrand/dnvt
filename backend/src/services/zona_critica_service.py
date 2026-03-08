from datetime import datetime, timezone
import uuid
from typing import Optional, List


NIVEL_RISCO = ["BAIXO", "MEDIO", "ALTO"]


class ZonaCriticaService:
    _db = None
    
    @classmethod
    def init_db(cls, db):
        cls._db = db
    
    @classmethod
    async def create(cls, data: dict) -> dict:
        zona_id = f"zona_{uuid.uuid4().hex[:12]}"
        now = datetime.now(timezone.utc)
        
        zona_doc = {
            "zona_id": zona_id,
            "latitude_centro": data["latitude_centro"],
            "longitude_centro": data["longitude_centro"],
            "raio_metros": data.get("raio_metros", 500),
            "nome": data.get("nome"),
            "total_acidentes": 0,
            "acidentes_graves": 0,
            "causa_mais_frequente": None,
            "nivel_risco": "BAIXO",
            "recomendacao_melhoria": None,
            "validado": False,
            "created_at": now.isoformat()
        }
        
        await cls._db.zonas_criticas.insert_one(zona_doc)
        return zona_doc
    
    @classmethod
    async def list(cls, validado: bool = None) -> List[dict]:
        query = {}
        if validado is not None:
            query["validado"] = validado
        
        return await cls._db.zonas_criticas.find(query, {"_id": 0}).to_list(500)
    
    @classmethod
    async def validar(cls, zona_id: str) -> bool:
        result = await cls._db.zonas_criticas.update_one(
            {"zona_id": zona_id},
            {"$set": {"validado": True}}
        )
        return result.matched_count > 0
    
    @classmethod
    async def calcular_automatico(cls) -> List[dict]:
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
        
        clusters = await cls._db.acidentes.aggregate(pipeline).to_list(20)
        
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
