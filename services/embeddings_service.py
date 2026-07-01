from sentence_transformers import SentenceTransformer
import numpy as np


class EmbeddingsService:
    def __init__(self, model_name: str = "all-MiniLM-L6-v2"):
        self.model = SentenceTransformer(model_name)

    def embed_texts(self, texts):
        # returns list of embeddings (floats)
        emb = self.model.encode(texts, convert_to_numpy=True, show_progress_bar=False)
        # ensure Python lists for storage
        return [e.tolist() if hasattr(e, 'tolist') else list(e) for e in emb]
