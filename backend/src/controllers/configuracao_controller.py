from datetime import datetime
from typing import Optional
from src.services import ConfiguracaoService
from src.models import ConfiguracaoUpdate, ConfiguracaoResponse, SMSRequest


class ConfiguracaoController:
    
    @staticmethod
    async def get() -> ConfiguracaoResponse:
        config = await ConfiguracaoService.get()
        
        # Check Ombala balance if token exists
        if config.get("ombala_token"):
            balance = await ConfiguracaoService.get_ombala_balance(config["ombala_token"])
            config["ombala_sms_balance"] = balance
        
        updated_at = config["updated_at"]
        if isinstance(updated_at, str):
            updated_at = datetime.fromisoformat(updated_at)
        
        return ConfiguracaoResponse(**{**config, "updated_at": updated_at})
    
    @staticmethod
    async def update(update: ConfiguracaoUpdate) -> ConfiguracaoResponse:
        update_data = {k: v for k, v in update.model_dump().items() if v is not None}
        config = await ConfiguracaoService.update(update_data)
        
        # Check Ombala balance
        if config.get("ombala_token"):
            balance = await ConfiguracaoService.get_ombala_balance(config["ombala_token"])
            config["ombala_sms_balance"] = balance
        
        updated_at = config["updated_at"]
        if isinstance(updated_at, str):
            updated_at = datetime.fromisoformat(updated_at)
        
        return ConfiguracaoResponse(**{**config, "updated_at": updated_at})
    
    @staticmethod
    async def get_google_maps_key() -> dict:
        config = await ConfiguracaoService.get()
        return {"api_key": config.get("google_maps_api_key")}
    
    @staticmethod
    async def send_sms(sms: SMSRequest) -> dict:
        return await ConfiguracaoService.send_sms(sms.phone_number, sms.message)
    
    @staticmethod
    async def get_sms_balance() -> dict:
        config = await ConfiguracaoService.get()
        
        if not config.get("ombala_token"):
            return {"saldo": None, "message": "Token Ombala não configurado"}
        
        balance = await ConfiguracaoService.get_ombala_balance(config["ombala_token"])
        if balance is not None:
            return {"saldo": balance}
        else:
            return {"saldo": None, "error": "Erro ao obter saldo"}
