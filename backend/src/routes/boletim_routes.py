from fastapi import APIRouter, Depends, Query, UploadFile, File
from fastapi.responses import StreamingResponse
from typing import List
from src.controllers import BoletimController
from src.models import BoletimCreate, BoletimResponse
from src.middlewares import get_current_user

router = APIRouter(prefix="/boletins", tags=["Boletins"])


@router.post("", response_model=BoletimResponse)
async def create(boletim: BoletimCreate, current_user: dict = Depends(get_current_user)):
    return await BoletimController.create(boletim, current_user)


@router.get("", response_model=List[BoletimResponse])
async def list_boletins(limit: int = Query(default=100, le=500), skip: int = 0):
    return await BoletimController.list(limit, skip)


@router.get("/{boletim_id}", response_model=BoletimResponse)
async def get_boletim(boletim_id: str):
    return await BoletimController.get(boletim_id)


@router.post("/{boletim_id}/upload")
async def upload_file(boletim_id: str, file: UploadFile = File(...), current_user: dict = Depends(get_current_user)):
    return await BoletimController.upload_file(boletim_id, file)


@router.get("/{boletim_id}/pdf")
async def generate_pdf(boletim_id: str, current_user: dict = Depends(get_current_user)):
    pdf_buffer, filename = await BoletimController.generate_pdf(boletim_id, current_user)
    return StreamingResponse(
        pdf_buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )
