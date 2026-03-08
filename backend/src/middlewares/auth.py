from fastapi import Request, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import jwt
import os

JWT_SECRET = os.environ.get('JWT_SECRET', 'dnvt_secret_key')
JWT_ALGORITHM = os.environ.get('JWT_ALGORITHM', 'HS256')

security = HTTPBearer(auto_error=False)


async def get_current_user(
    request: Request, 
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Get current authenticated user from token"""
    from src.services.user_service import UserService
    
    token = None
    if credentials:
        token = credentials.credentials
    if not token:
        token = request.cookies.get("session_token")
    if not token:
        raise HTTPException(status_code=401, detail="Token não fornecido")
    
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user = await UserService.get_by_user_id(payload["user_id"])
        if not user:
            raise HTTPException(status_code=401, detail="Usuário não encontrado")
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expirado")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Token inválido")


async def get_optional_user(
    request: Request, 
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Get current user if authenticated, or None"""
    try:
        return await get_current_user(request, credentials)
    except:
        return None


async def require_admin(current_user: dict = Depends(get_current_user)):
    """Require admin role"""
    if current_user.get("tipo") != "ADMIN":
        raise HTTPException(status_code=403, detail="Apenas administradores podem acessar")
    return current_user


async def require_admin_or_police(current_user: dict = Depends(get_current_user)):
    """Require admin or police role"""
    if current_user.get("tipo") not in ["ADMIN", "POLICIA"]:
        raise HTTPException(status_code=403, detail="Sem permissão")
    return current_user
