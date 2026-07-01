from groq import Groq

from backend.config import get_settings


class QueryRewriter:
    def __init__(self) -> None:
        settings = get_settings()
        self.client = Groq(
            api_key=settings.groq_api_key,
        ) if settings.groq_api_key else None
        self.model = settings.groq_model

    def rewrite(self, question: str, failed_chunks: list[dict]) -> str:
        if not self.client:
            return question

        failed_topics = "\n".join(
            c["text"][:200] for c in failed_chunks[:3]
        ) if failed_chunks else "no context"

        prompt = (
            "You are a query rewriter for a document retrieval system. "
            "The original question did not retrieve relevant results. "
            f"Here are fragments of what was retrieved (but deemed irrelevant):\n"
            f"{failed_topics}\n\n"
            f"Original question: {question}\n\n"
            "Rewrite this question to be more specific and searchable "
            "so a vector database can find better matches. "
            "Return only the rewritten question, nothing else."
        )

        try:
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[{"role": "user", "content": prompt}],
                temperature=0.3,
                max_tokens=256,
            )
            rewritten = response.choices[0].message.content.strip().strip('"')
            return rewritten if rewritten else question
        except Exception:
            return question
