from fastapi import HTTPException
from datetime import datetime
import httpx
from src.services import UserService
from src.models import UserCreate, UserLogin, UserUpdate, UserResponse, TokenResponse
from src.utils.auth import verify_password, create_token


class AuthController:
    
    @staticmethod
    async def register(user_data: UserCreate) -> TokenResponse:
        existing = await UserService.get_by_email(user_data.email)
        if existing:
            raise HTTPException(status_code=400, detail="Email já cadastrado")
        
        user = await UserService.create(
            nome=user_data.nome,
            email=user_data.email,
            senha=user_data.senha,
            telefone=user_data.telefone,
            tipo=user_data.tipo
        )
        
        token = create_token(user["user_id"], user["email"], user["tipo"])
        now = datetime.fromisoformat(user["created_at"])
        
        return TokenResponse(
            access_token=token,
            user=UserResponse(
                user_id=user["user_id"],
                nome=user["nome"],
                email=user["email"],
                telefone=user.get("telefone"),
                tipo=user["tipo"],
                bilhete_identidade=None,
                endereco=None,
                zonas_notificacao=[],
                alertas_novos_acidentes=True,
                alertas_sonoros=True,
                alertas_sms=False,
                created_at=now,
                updated_at=now
            )
        )
    
    @staticmethod
    async def login(credentials: UserLogin) -> TokenResponse:
        user = await UserService.get_by_email(credentials.email)
        if not user:
            raise HTTPException(status_code=401, detail="Credenciais inválidas")
        
        if not verify_password(credentials.senha, user["senha"]):
            raise HTTPException(status_code=401, detail="Credenciais inválidas")
        
        token = create_token(user["user_id"], user["email"], user["tipo"])
        
        created_at = user["created_at"]
        if isinstance(created_at, str):
            created_at = datetime.fromisoformat(created_at)
        
        updated_at = user.get("updated_at")
        if updated_at and isinstance(updated_at, str):
            updated_at = datetime.fromisoformat(updated_at)
        
        return TokenResponse(
            access_token=token,
            user=UserResponse(
                user_id=user["user_id"],
                nome=user["nome"],
                email=user["email"],
                telefone=user.get("telefone"),
                tipo=user["tipo"],
                bilhete_identidade=user.get("bilhete_identidade"),
                endereco=user.get("endereco"),
                zonas_notificacao=user.get("zonas_notificacao", []),
                alertas_novos_acidentes=user.get("alertas_novos_acidentes", True),
                alertas_sonoros=user.get("alertas_sonoros", True),
                alertas_sms=user.get("alertas_sms", False),
                created_at=created_at,
                updated_at=updated_at
            )
        )
    
    @staticmethod
    async def google_session(session_id: str) -> TokenResponse:
        async with httpx.AsyncClient() as client:
            response = await client.get(
                "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data",
                headers={"X-Session-ID": session_id}
            )
            
            if response.status_code != 200:
                raise HTTPException(status_code=401, detail="Sessão inválida")
            
            google_data = response.json()
        
        user = await UserService.get_by_email(google_data["email"])
        
        if not user:
            user = await UserService.create_google_user(
                email=google_data["email"],
                name=google_data.get("name", ""),
                picture=google_data.get("picture"),
                google_id=google_data.get("id")
            )
        
        token = create_token(user["user_id"], user["email"], user["tipo"])
        
        created_at = user["created_at"]
        if isinstance(created_at, str):
            created_at = datetime.fromisoformat(created_at)
        
        updated_at = user.get("updated_at")
        if updated_at and isinstance(updated_at, str):
            updated_at = datetime.fromisoformat(updated_at)
        
        return TokenResponse(
            access_token=token,
            user=UserResponse(
                user_id=user["user_id"],
                nome=user["nome"],
                email=user["email"],
                telefone=user.get("telefone"),
                tipo=user["tipo"],
                bilhete_identidade=user.get("bilhete_identidade"),
                endereco=user.get("endereco"),
                zonas_notificacao=user.get("zonas_notificacao", []),
                alertas_novos_acidentes=user.get("alertas_novos_acidentes", True),
                alertas_sonoros=user.get("alertas_sonoros", True),
                alertas_sms=user.get("alertas_sms", False),
                created_at=created_at,
                updated_at=updated_at
            )
        )
    
    @staticmethod
    def user_to_response(user: dict) -> UserResponse:
        created_at = user["created_at"]
        if isinstance(created_at, str):
            created_at = datetime.fromisoformat(created_at)
        
        updated_at = user.get("updated_at")
        if updated_at and isinstance(updated_at, str):
            updated_at = datetime.fromisoformat(updated_at)
        
        return UserResponse(
            user_id=user["user_id"],
            nome=user["nome"],
            email=user["email"],
            telefone=user.get("telefone"),
            tipo=user["tipo"],
            bilhete_identidade=user.get("bilhete_identidade"),
            endereco=user.get("endereco"),
            zonas_notificacao=user.get("zonas_notificacao", []),
            alertas_novos_acidentes=user.get("alertas_novos_acidentes", True),
            alertas_sonoros=user.get("alertas_sonoros", True),
            alertas_sms=user.get("alertas_sms", False),
            created_at=created_at,
            updated_at=updated_at
        )


class UserController:
    
    @staticmethod
    async def get_me(current_user: dict) -> UserResponse:
        return AuthController.user_to_response(current_user)
    
    @staticmethod
    async def update_profile(current_user: dict, update_data: UserUpdate) -> UserResponse:
        data = {k: v for k, v in update_data.model_dump().items() if v is not None}
        
        if not data:
            raise HTTPException(status_code=400, detail="Nenhum dado para atualizar")
        
        try:
            updated_user = await UserService.update(current_user["user_id"], data)
            return AuthController.user_to_response(updated_user)
        except ValueError as e:
            raise HTTPException(status_code=400, detail=str(e))
