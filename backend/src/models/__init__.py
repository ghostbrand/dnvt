# Models __init__.py
from .user import (
    UserCreate, 
    UserLogin, 
    UserUpdate, 
    UserResponse, 
    TokenResponse
)
from .acidente import (
    AcidenteCreate, 
    AcidenteUpdate, 
    AcidenteResponse
)
from .boletim import (
    BoletimCreate, 
    BoletimResponse
)
from .assistencia import (
    AssistenciaCreate, 
    AssistenciaUpdate, 
    AssistenciaResponse
)
from .zona_critica import (
    ZonaCriticaCreate, 
    ZonaCriticaResponse
)
from .configuracao import (
    ConfiguracaoUpdate, 
    ConfiguracaoResponse
)
from .sms import SMSRequest

__all__ = [
    "UserCreate", "UserLogin", "UserUpdate", "UserResponse", "TokenResponse",
    "AcidenteCreate", "AcidenteUpdate", "AcidenteResponse",
    "BoletimCreate", "BoletimResponse",
    "AssistenciaCreate", "AssistenciaUpdate", "AssistenciaResponse",
    "ZonaCriticaCreate", "ZonaCriticaResponse",
    "ConfiguracaoUpdate", "ConfiguracaoResponse",
    "SMSRequest"
]
