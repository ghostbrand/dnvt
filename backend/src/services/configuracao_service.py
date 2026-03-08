from datetime import datetime, timezone
import uuid
from typing import Optional
import httpx


class ConfiguracaoService:
    _db = None
    
    @classmethod
    def init_db(cls, db):
        cls._db = db
    
    @classmethod
    async def get(cls) -> dict:
        config = await cls._db.configuracoes.find_one({}, {"_id": 0})
        
        if not config:
            config = {
                "config_id": f"config_{uuid.uuid4().hex[:8]}",
                "google_maps_api_key": None,
                "ombala_token": None,
                "ombala_sender_name": None,
                "ombala_sms_balance": None,
                "updated_at": datetime.now(timezone.utc).isoformat()
            }
            await cls._db.configuracoes.insert_one(config)
        
        return config
    
    @classmethod
    async def update(cls, update_data: dict) -> dict:
        config = await cls.get()
        
        update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
        
        await cls._db.configuracoes.update_one({}, {"$set": update_data})
        
        return await cls.get()
    
    @classmethod
    async def get_ombala_balance(cls, token: str) -> Optional[int]:
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    "https://api.useombala.ao/v1/credits",
                    headers={"Authorization": f"Token {token}"}
                )
                if response.status_code == 200:
                    data = response.json()
                    return data.get("balance", data.get("credits", 0))
        except:
            pass
        return None
    
    @classmethod
    async def send_sms(cls, phone_number: str, message: str) -> dict:
        config = await cls.get()
        
        if not config.get("ombala_token") or not config.get("ombala_sender_name"):
            return {"success": False, "error": "Configurações do Ombala não definidas"}
        
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    "https://api.useombala.ao/v1/messages",
                    headers={
                        "Authorization": f"Token {config['ombala_token']}",
                        "Content-Type": "application/json"
                    },
                    json={
                        "message": message,
                        "from": config["ombala_sender_name"],
                        "to": phone_number
                    }
                )
                
                if response.status_code == 201:
                    return {"success": True, "message": "SMS enviado com sucesso"}
                else:
                    return {"success": False, "error": response.text}
        except Exception as e:
            return {"success": False, "error": str(e)}
