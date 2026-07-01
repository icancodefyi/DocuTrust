# DocuTrust: Enterprise Advanced RAG Platform

DocuTrust is a full-stack FastAPI RAG application for uploading PDF documents, extracting page text with PyMuPDF, chunking content, embedding it with `sentence-transformers/all-MiniLM-L6-v2`, storing vectors in ChromaDB, and answering questions with page citations.

If Ollama is installed locally with a `llama3.1` model, DocuTrust uses it for answer generation. Otherwise, it returns a retrieval-grounded placeholder answer with citations so the app remains usable offline.

## Features

- FastAPI backend with modular routers, services, models, and utils.
- PDF upload API with validation and saved files.
- Chat API with top-k vector retrieval.
- ChromaDB persistent vector storage.
- Metadata storage in MongoDB when available, with SQLite fallback.
- Modern responsive dark frontend using HTML, CSS, and vanilla JavaScript.
- CORS enabled for local development.

## Project Structure

```text
DocuTrust/
  backend/
    main.py
    config.py
    routers/
    services/
    models/
    utils/
  frontend/
    templates/
    static/
  uploads/
  chroma_db/
  data/
  requirements.txt
  README.md
```

## Setup

```bash
cd DocuTrust
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
```

Optional MongoDB configuration:

```bash
copy .env.example .env
```

Set `MONGO_URI` in `.env`. If MongoDB cannot be reached, DocuTrust automatically uses `data/metadata.db`.

## Run

```bash
uvicorn backend.main:app --reload
```

Open `http://127.0.0.1:8000`.

## API

- `GET /health` checks service health.
- `POST /api/upload` accepts a multipart PDF file and indexes it.
- `GET /api/documents` lists indexed documents.
- `POST /api/chat` answers questions using retrieved document chunks.

## File Guide

- `backend/main.py`: Creates the FastAPI app, mounts static assets, enables CORS, and registers routers.
- `backend/config.py`: Central settings for paths, model names, Chroma collection, chunking, upload limits, and MongoDB.
- `backend/models/schemas.py`: Pydantic request and response models.
- `backend/routers/health.py`: Health-check endpoint.
- `backend/routers/upload.py`: PDF upload and document listing endpoints.
- `backend/routers/chat.py`: Question-answering endpoint.
- `backend/services/pdf_service.py`: Extracts text from PDF pages with PyMuPDF.
- `backend/services/embedding_service.py`: Loads Sentence Transformers and creates normalized embeddings.
- `backend/services/vector_store.py`: Persists and queries document vectors in ChromaDB.
- `backend/services/metadata_store.py`: Stores document metadata in MongoDB or SQLite fallback.
- `backend/services/llm_service.py`: Uses local Ollama when available or returns a grounded placeholder.
- `backend/services/rag_service.py`: Coordinates upload ingestion, chunking, embedding, retrieval, and citations.
- `backend/utils/file_utils.py`: Sanitizes filenames and validates PDF uploads.
- `backend/utils/text_splitter.py`: Splits page text into overlapping chunks.
- `frontend/templates/index.html`: Single-page upload and chat UI.
- `frontend/static/css/styles.css`: Responsive dark theme and loading animations.
- `frontend/static/js/app.js`: Upload, chat, document refresh, drag-and-drop, and citation rendering.
- `uploads/`: Saved PDF files.
- `chroma_db/`: Persistent ChromaDB vector database.
- `data/`: SQLite fallback metadata database.
- `requirements.txt`: Python dependencies.
