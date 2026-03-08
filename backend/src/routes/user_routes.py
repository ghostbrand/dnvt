from fastapi import APIRouter, Depends
from src.controllers import UserController
from src.models import UserUpdate, UserResponse
from src.middlewares import get_current_user

router = APIRouter(prefix="/usuarios", tags=["Usuarios"])


@router.patch("/me", response_model=UserResponse)
async def update_profile(update: UserUpdate, current_user: dict = Depends(get_current_user)):
    return await UserController.update_profile(current_user, update)
