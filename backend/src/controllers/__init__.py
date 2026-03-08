# Controllers __init__.py
from .auth_controller import AuthController, UserController
from .acidente_controller import AcidenteController
from .boletim_controller import BoletimController
from .assistencia_controller import AssistenciaController
from .zona_critica_controller import ZonaCriticaController
from .configuracao_controller import ConfiguracaoController
from .estatistica_controller import EstatisticaController

__all__ = [
    "AuthController",
    "UserController",
    "AcidenteController",
    "BoletimController",
    "AssistenciaController",
    "ZonaCriticaController",
    "ConfiguracaoController",
    "EstatisticaController"
]
