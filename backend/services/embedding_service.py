from functools import lru_cache

from sentence_transformers import SentenceTransformer

from backend.config import get_settings


class EmbeddingService:
    def __init__(self, model_name: str) -> None:
        self.model = SentenceTransformer(model_name)

    def embed_texts(self, texts: list[str]) -> list[list[float]]:
        if not texts:
            return []
        vectors = self.model.encode(texts, normalize_embeddings=True)
        return vectors.tolist()

    def embed_query(self, query: str) -> list[float]:
        vector = self.model.encode([query], normalize_embeddings=True)[0]
        return vector.tolist()


@lru_cache
def get_embedding_service() -> EmbeddingService:
    settings = get_settings()
    return EmbeddingService(settings.embedding_model_name)
