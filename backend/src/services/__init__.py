# Services __init__.py
from .user_service import UserService
from .acidente_service import AcidenteService
from .boletim_service import BoletimService
from .assistencia_service import AssistenciaService
from .zona_critica_service import ZonaCriticaService
from .configuracao_service import ConfiguracaoService
from .estatistica_service import EstatisticaService

__all__ = [
    "UserService",
    "AcidenteService",
    "BoletimService",
    "AssistenciaService",
    "ZonaCriticaService",
    "ConfiguracaoService",
    "EstatisticaService"
]


def init_services(db):
    """Initialize all services with database connection"""
    UserService.init_db(db)
    AcidenteService.init_db(db)
    BoletimService.init_db(db)
    AssistenciaService.init_db(db)
    ZonaCriticaService.init_db(db)
    ConfiguracaoService.init_db(db)
    EstatisticaService.init_db(db)
