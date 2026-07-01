import os
from fastapi import APIRouter, UploadFile, File, HTTPException
from fastapi.responses import JSONResponse

from services.pdf_service import extract_text, chunk_text
from services.embeddings_service import EmbeddingsService
from services.vector_store import VectorStore

router = APIRouter()

UPLOAD_DIR = os.path.join(os.getcwd(), "DocuTrust", "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)

emb_service = EmbeddingsService()
vector_store = VectorStore(persist_directory=os.path.join(os.getcwd(), "DocuTrust", "storage"))


@router.post("/upload")
async def upload_pdf(file: UploadFile = File(...)):
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are supported")

    save_path = os.path.join(UPLOAD_DIR, file.filename)
    with open(save_path, "wb") as f:
        content = await file.read()
        f.write(content)

    text = extract_text(save_path)
    chunks = chunk_text(text)
    embeddings = emb_service.embed_texts([c["text"] for c in chunks])

    # prepare metadata
    ids = []
    metadatas = []
    documents = []
    for c, emb in zip(chunks, embeddings):
        uid = f"{file.filename}::chunk::{c['id']}"
        ids.append(uid)
        metadatas.append({"source": file.filename, "chunk_id": c["id"], "text_len": len(c["text"])})
        documents.append(c["text"])

    vector_store.add_documents(ids=ids, embeddings=embeddings, metadatas=metadatas, documents=documents)

    return JSONResponse({"status": "ok", "uploaded": file.filename, "chunks": len(chunks)})
