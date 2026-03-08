from fastapi import APIRouter, Depends
from src.controllers import ConfiguracaoController
from src.models import ConfiguracaoUpdate, ConfiguracaoResponse, SMSRequest
from src.middlewares import get_current_user, require_admin

router = APIRouter(prefix="/configuracoes", tags=["Configuracoes"])


@router.get("", response_model=ConfiguracaoResponse)
async def get_config(current_user: dict = Depends(require_admin)):
    return await ConfiguracaoController.get()


@router.patch("", response_model=ConfiguracaoResponse)
async def update_config(update: ConfiguracaoUpdate, current_user: dict = Depends(require_admin)):
    return await ConfiguracaoController.update(update)


@router.get("/google-maps-key")
async def get_google_maps_key():
    return await ConfiguracaoController.get_google_maps_key()


# SMS Routes
sms_router = APIRouter(prefix="/sms", tags=["SMS"])


@sms_router.post("/enviar")
async def send_sms(sms: SMSRequest, current_user: dict = Depends(get_current_user)):
    return await ConfiguracaoController.send_sms(sms)


@sms_router.get("/saldo")
async def get_saldo(current_user: dict = Depends(get_current_user)):
    return await ConfiguracaoController.get_sms_balance()
