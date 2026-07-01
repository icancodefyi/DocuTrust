from fastapi import APIRouter, Depends

from backend.models.schemas import ChatRequest, ChatResponse
from backend.routers.upload import get_rag_service
from backend.services.rag_service import RAGService

router = APIRouter(prefix="/api", tags=["chat"])


@router.post("/chat", response_model=ChatResponse)
def chat(request: ChatRequest, rag_service: RAGService = Depends(get_rag_service)) -> ChatResponse:
    return rag_service.chat(question=request.question, top_k=request.top_k)
