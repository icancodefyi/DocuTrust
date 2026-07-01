from typing import Any
from functools import lru_cache

import chromadb
from chromadb.config import Settings as ChromaSettings

from backend.config import get_settings


@lru_cache(maxsize=1)
def get_chroma_client() -> chromadb.ClientAPI:
    settings = get_settings()
    settings.chroma_dir.mkdir(parents=True, exist_ok=True)
    return chromadb.PersistentClient(
        path=str(settings.chroma_dir),
        settings=ChromaSettings(anonymized_telemetry=False),
    )


class VectorStore:
    def __init__(self) -> None:
        settings = get_settings()
        self.client = get_chroma_client()
        self.collection = self.client.get_or_create_collection(
            name=settings.chroma_collection,
            metadata={"hnsw:space": "cosine"},
        )

    def add_chunks(
        self,
        ids: list[str],
        texts: list[str],
        embeddings: list[list[float]],
        metadatas: list[dict[str, Any]],
    ) -> None:
        if not ids:
            return
        self.collection.add(
            ids=ids,
            documents=texts,
            embeddings=embeddings,
            metadatas=metadatas,
        )

    def search(self, query_embedding: list[float], top_k: int) -> list[dict[str, Any]]:
        results = self.collection.query(
            query_embeddings=[query_embedding],
            n_results=top_k,
            include=["documents", "metadatas", "distances"],
        )

        documents = results.get("documents", [[]])[0]
        metadatas = results.get("metadatas", [[]])[0]
        distances = results.get("distances", [[]])[0]
        ids = results.get("ids", [[]])[0]

        matches: list[dict[str, Any]] = []
        for chunk_id, document, metadata, distance in zip(ids, documents, metadatas, distances, strict=False):
            matches.append(
                {
                    "id": chunk_id,
                    "text": document,
                    "metadata": metadata,
                    "score": 1 - distance if distance is not None else None,
                }
            )
        return matches
