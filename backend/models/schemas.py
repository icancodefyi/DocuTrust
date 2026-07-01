from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field


class HealthResponse(BaseModel):
    status: str
    service: str
    version: str


class DocumentMetadata(BaseModel):
    document_id: str
    filename: str
    stored_filename: str
    pages: int
    chunks: int
    uploaded_at: datetime


class UploadResponse(BaseModel):
    message: str
    document: DocumentMetadata


class ChatRequest(BaseModel):
    question: str = Field(..., min_length=2, max_length=2000)
    top_k: int = Field(default=5, ge=1, le=10)
    client_id: str | None = None


class Citation(BaseModel):
    document_id: str
    filename: str
    page: int
    chunk_id: str
    score: float | None = None
    excerpt: str
    url: str = ""


class ChatResponse(BaseModel):
    answer: str
    citations: list[Citation]
    client_id: str
    debug: dict[str, Any] = Field(default_factory=dict)
