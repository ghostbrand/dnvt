from pydantic import BaseModel
from typing import Optional
from datetime import datetime


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
