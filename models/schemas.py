from pydantic import BaseModel
from typing import List, Any


class UploadResponse(BaseModel):
    status: str
    uploaded: str
    chunks: int


class Citation(BaseModel):
    source: str
    chunk_id: Any


class ChatResponse(BaseModel):
    answer: str
    citations: List[Citation]
