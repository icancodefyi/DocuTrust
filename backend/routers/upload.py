from functools import lru_cache

from fastapi import APIRouter, Depends, File, UploadFile

from backend.config import get_settings
from backend.models.schemas import UploadResponse
from backend.services.rag_service import RAGService
from backend.utils.file_utils import validate_pdf_upload

router = APIRouter(prefix="/api", tags=["documents"])


@lru_cache
def get_rag_service() -> RAGService:
    return RAGService()


@router.post("/upload", response_model=UploadResponse)
async def upload_pdf(
    file: UploadFile = File(...),
    rag_service: RAGService = Depends(get_rag_service),
) -> UploadResponse:
    settings = get_settings()
    validate_pdf_upload(file, settings.max_upload_mb)
    return await rag_service.ingest_pdf(file)


@router.get("/documents")
def list_documents(rag_service: RAGService = Depends(get_rag_service)) -> list[dict]:
    return rag_service.documents()
