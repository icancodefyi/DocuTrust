from dataclasses import dataclass


@dataclass(frozen=True)
class TextChunk:
    text: str
    page: int
    index: int


def split_pages_into_chunks(
    pages: list[tuple[int, str]],
    chunk_size: int,
    chunk_overlap: int,
) -> list[TextChunk]:
    if chunk_overlap >= chunk_size:
        raise ValueError("chunk_overlap must be smaller than chunk_size")

    chunks: list[TextChunk] = []
    chunk_index = 0
    stride = chunk_size - chunk_overlap

    for page_number, text in pages:
        normalized = " ".join(text.split())
        if not normalized:
            continue

        start = 0
        while start < len(normalized):
            end = start + chunk_size
            chunk_text = normalized[start:end].strip()
            if chunk_text:
                chunks.append(TextChunk(text=chunk_text, page=page_number, index=chunk_index))
                chunk_index += 1
            if end >= len(normalized):
                break
            start += stride

    return chunks
