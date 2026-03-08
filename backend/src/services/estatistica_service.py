from datetime import datetime, timezone
import uuid
from typing import List


class EstatisticaService:
    _db = None
    
    @classmethod
    def init_db(cls, db):
        cls._db = db
    
    @classmethod
    async def get_resumo(cls) -> dict:
        now = datetime.now(timezone.utc)
        hoje_inicio = now.replace(hour=0, minute=0, second=0, microsecond=0).isoformat()
        mes_inicio = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0).isoformat()
        
        total_acidentes = await cls._db.acidentes.count_documents({})
        acidentes_hoje = await cls._db.acidentes.count_documents({"created_at": {"$gte": hoje_inicio}})
        acidentes_mes = await cls._db.acidentes.count_documents({"created_at": {"$gte": mes_inicio}})
        
        acidentes_ativos = await cls._db.acidentes.count_documents({"status": {"$in": ["REPORTADO", "VALIDADO", "EM_ATENDIMENTO"]}})
        acidentes_graves = await cls._db.acidentes.count_documents({"gravidade": {"$in": ["GRAVE", "FATAL"]}})
        assistencias_ativas = await cls._db.assistencias.count_documents({"status": {"$in": ["A_CAMINHO", "NO_LOCAL"]}})
        zonas_criticas = await cls._db.zonas_criticas.count_documents({"nivel_risco": "ALTO"})
        
        gravidade_stats = await cls._db.acidentes.aggregate([
            {"$group": {"_id": "$gravidade", "count": {"$sum": 1}}}
        ]).to_list(10)
        
        causa_stats = await cls._db.acidentes.aggregate([
            {"$match": {"causa_principal": {"$ne": None}}},
            {"$group": {"_id": "$causa_principal", "count": {"$sum": 1}}},
            {"$sort": {"count": -1}},
            {"$limit": 5}
        ]).to_list(5)
        
        tipo_stats = await cls._db.acidentes.aggregate([
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
    
    @classmethod
    async def get_mensal(cls, ano: int, mes: int) -> dict:
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
        
        result = await cls._db.acidentes.aggregate(pipeline).to_list(1)
        
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
    
    @classmethod
    async def get_por_hora(cls) -> List[dict]:
        pipeline = [
            {"$addFields": {
                "hora": {"$hour": {"$dateFromString": {"dateString": "$created_at"}}}
            }},
            {"$group": {"_id": "$hora", "count": {"$sum": 1}}},
            {"$sort": {"_id": 1}}
        ]
        
        result = await cls._db.acidentes.aggregate(pipeline).to_list(24)
        
        hours_data = {i: 0 for i in range(24)}
        for item in result:
            if item["_id"] is not None:
                hours_data[item["_id"]] = item["count"]
        
        return [{"hora": h, "acidentes": c} for h, c in hours_data.items()]
    
    @classmethod
    async def get_por_dia_semana(cls) -> List[dict]:
        pipeline = [
            {"$addFields": {
                "dia_semana": {"$dayOfWeek": {"$dateFromString": {"dateString": "$created_at"}}}
            }},
            {"$group": {"_id": "$dia_semana", "count": {"$sum": 1}}},
            {"$sort": {"_id": 1}}
        ]
        
        result = await cls._db.acidentes.aggregate(pipeline).to_list(7)
        
        dias = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"]
        dias_data = {i+1: {"dia": dias[i], "acidentes": 0} for i in range(7)}
        
        for item in result:
            if item["_id"] is not None:
                dias_data[item["_id"]]["acidentes"] = item["count"]
        
        return list(dias_data.values())
