import fitz
import uuid


def extract_text(pdf_path: str) -> str:
    doc = fitz.open(pdf_path)
    texts = []
    for page in doc:
        texts.append(page.get_text("text"))
    return "\n".join(texts)


def chunk_text(text: str, chunk_size: int = 1000, overlap: int = 200):
    chunks = []
    start = 0
    idx = 0
    length = len(text)
    while start < length:
        end = min(start + chunk_size, length)
        chunk = text[start:end].strip()
        if chunk:
            chunks.append({"id": idx, "text": chunk})
            idx += 1
        start = max(end - overlap, end)
    return chunks
