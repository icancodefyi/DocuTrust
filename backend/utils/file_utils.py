import re
from pathlib import Path
from uuid import uuid4

from fastapi import HTTPException, UploadFile, status


SAFE_NAME_PATTERN = re.compile(r"[^A-Za-z0-9._-]+")


def sanitize_filename(filename: str) -> str:
    cleaned = SAFE_NAME_PATTERN.sub("_", Path(filename).name).strip("._")
    return cleaned or "document.pdf"


def build_stored_filename(filename: str) -> str:
    return f"{uuid4().hex}_{sanitize_filename(filename)}"


def validate_pdf_upload(file: UploadFile, max_upload_mb: int) -> None:
    if not file.filename or not file.filename.lower().endswith(".pdf"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only PDF files are supported.",
        )

    content_type = (file.content_type or "").lower()
    if content_type and content_type not in {"application/pdf", "application/octet-stream"}:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded file must be a PDF.",
        )

    content_length = file.headers.get("content-length")
    if content_length and int(content_length) > max_upload_mb * 1024 * 1024:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"PDF exceeds the {max_upload_mb} MB upload limit.",
        )
