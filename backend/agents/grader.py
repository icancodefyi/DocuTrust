import os
from functools import lru_cache

from sentence_transformers import CrossEncoder

from backend.config import get_settings


@lru_cache(maxsize=1)
def _get_cross_encoder(model_name: str) -> CrossEncoder:
    token = get_settings().hf_token
    if token:
        os.environ["HF_TOKEN"] = token
    return CrossEncoder(model_name)


class RelevanceGrader:
    def __init__(self) -> None:
        settings = get_settings()
        self.model = _get_cross_encoder(settings.cross_encoder_model)
        self.threshold = settings.relevance_threshold

    def grade(self, question: str, chunks: list[dict]) -> tuple[list[dict], list[dict]]:
        if not chunks:
            return [], []

        pairs = [(question, c["text"]) for c in chunks]
        scores = self.model.predict(pairs)

        passed: list[dict] = []
        failed: list[dict] = []
        for chunk, score in zip(chunks, scores, strict=False):
            score = float(score)
            chunk["relevance_score"] = score
            if score >= self.threshold:
                passed.append(chunk)
            else:
                failed.append(chunk)

        return passed, failed
