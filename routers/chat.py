from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from services.embeddings_service import EmbeddingsService
from services.vector_store import VectorStore
from services.llm_service import answer_with_llm

router = APIRouter()

emb_service = EmbeddingsService()
vector_store = VectorStore(persist_directory="./chroma_db")


class ChatRequest(BaseModel):
    question: str
    top_k: int = 3


@router.post("/chat")   
def chat(req: ChatRequest):
    if not req.question:
        raise HTTPException(status_code=400, detail="question is required")

    q_emb = emb_service.embed_texts([req.question])[0]
    results = vector_store.query(q_emb, n_results=req.top_k)

    print("DEBUG RESULTS:", results)

    contexts = []
    citations = []

    for r in results:
        contexts.append(r.get("document") or r.get("text"))

        meta = r.get("metadata", {})
        citations.append({
            "source": meta.get("source"),
            "chunk_id": meta.get("chunk_id")
        })

    if not contexts:
        return {
            "answer": "No relevant context retrieved. Check vector DB indexing.",
            "citations": []
        }

    answer = answer_with_llm(
        question=req.question,
        contexts="\n".join(contexts)
    )

    return {"answer": answer, "citations": citations}