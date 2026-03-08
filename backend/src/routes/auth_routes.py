from fastapi import APIRouter, Depends, Request
from src.controllers import AuthController, UserController
from src.models import UserCreate, UserLogin, UserUpdate, UserResponse, TokenResponse
from src.middlewares import get_current_user

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/register", response_model=TokenResponse)
async def register(user: UserCreate):
    return await AuthController.register(user)


@router.post("/login", response_model=TokenResponse)
async def login(credentials: UserLogin):
    return await AuthController.login(credentials)


@router.post("/google/session", response_model=TokenResponse)
async def google_session(request: Request):
    body = await request.json()
    session_id = body.get("session_id")
    if not session_id:
        from fastapi import HTTPException
        raise HTTPException(status_code=400, detail="session_id obrigatório")
    return await AuthController.google_session(session_id)


@router.get("/me", response_model=UserResponse)
async def get_me(current_user: dict = Depends(get_current_user)):
    return await UserController.get_me(current_user)
