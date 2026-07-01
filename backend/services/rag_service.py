from pathlib import Path
from uuid import uuid4

from fastapi import UploadFile

from backend.agents.graph import CRAGPipeline
from backend.config import get_settings
from backend.models.schemas import ChatResponse, Citation, DocumentMetadata, UploadResponse
from backend.services.embedding_service import get_embedding_service
from backend.services.metadata_store import MetadataStore, utc_now_iso
from backend.services.pdf_service import PDFService
from backend.services.vector_store import VectorStore
from backend.utils.file_utils import build_stored_filename
from backend.utils.text_splitter import split_pages_into_chunks


class RAGService:
    def __init__(self) -> None:
        self.settings = get_settings()
        self.pdf_service = PDFService()
        self.metadata_store = MetadataStore()
        self.vector_store = VectorStore()
        self.crag = CRAGPipeline()

    async def ingest_pdf(self, file: UploadFile) -> UploadResponse:
        self.settings.uploads_dir.mkdir(parents=True, exist_ok=True)
        document_id = uuid4().hex
        stored_filename = build_stored_filename(file.filename or "document.pdf")
        pdf_path = self.settings.uploads_dir / stored_filename

        await self._save_upload(file, pdf_path)
        pages = self.pdf_service.extract_pages(pdf_path)
        chunks = split_pages_into_chunks(pages, self.settings.chunk_size, self.settings.chunk_overlap)

        chunk_ids = [f"{document_id}:{chunk.index}" for chunk in chunks]
        texts = [chunk.text for chunk in chunks]
        embeddings = get_embedding_service().embed_texts(texts)
        metadatas = [
            {
                "document_id": document_id,
                "filename": file.filename,
                "stored_filename": stored_filename,
                "page": chunk.page,
                "chunk_index": chunk.index,
            }
            for chunk in chunks
        ]
        self.vector_store.add_chunks(chunk_ids, texts, embeddings, metadatas)

        metadata = {
            "document_id": document_id,
            "filename": file.filename or "document.pdf",
            "stored_filename": stored_filename,
            "pages": len(pages),
            "chunks": len(chunks),
            "uploaded_at": utc_now_iso(),
        }
        self.metadata_store.save_document(metadata)

        return UploadResponse(
            message="PDF uploaded, parsed, embedded, and indexed successfully.",
            document=DocumentMetadata(**metadata),
        )

    async def _save_upload(self, file: UploadFile, destination: Path) -> None:
        with destination.open("wb") as buffer:
            while chunk := await file.read(1024 * 1024):
                buffer.write(chunk)
        await file.close()

    def chat(self, question: str, top_k: int, client_id: str | None = None) -> ChatResponse:
        import uuid

        if not client_id:
            client_id = uuid.uuid4().hex[:12]

        result = self.crag.run(question)

        citations = [
            Citation(**c) for c in result["citations"]
        ]

        trace = {
            "client_id": client_id,
            "question": question,
            "rewritten_question": "",
            "answer": result["answer"],
            "chunks_retrieved": len(result["citations"]),
            "chunks_passed": len(result["citations"]),
            "web_fallback": False,
            "model_used": "groq-crag",
        }
        self.metadata_store.save_trace(trace)

        return ChatResponse(
            answer=result["answer"],
            citations=citations,
            client_id=client_id,
            debug={
                "retrieved_chunks": len(result["citations"]),
                "llm": "groq-crag",
                "steps": result["steps"],
            },
        )

    def documents(self) -> list[dict]:
        return self.metadata_store.list_documents()
