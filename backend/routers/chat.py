import json

from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse

from backend.models.schemas import ChatRequest, ChatResponse
from backend.routers.upload import get_rag_service
from backend.services.rag_service import RAGService

router = APIRouter(prefix="/api", tags=["chat"])


@router.post("/chat", response_model=ChatResponse)
def chat(request: ChatRequest, rag_service: RAGService = Depends(get_rag_service)) -> ChatResponse:
    return rag_service.chat(
        question=request.question,
        top_k=request.top_k,
        client_id=request.client_id,
    )


@router.post("/chat/stream")
def chat_stream(request: ChatRequest, rag_service: RAGService = Depends(get_rag_service)):
    async def event_stream():
        for event in rag_service.crag.run_stream(request.question):
            yield f"data: {json.dumps(event)}\n\n"

    return StreamingResponse(event_stream(), media_type="text/event-stream")
