from __future__ import annotations

from openai import OpenAI

from backend.config import get_settings


class LLMService:
    def __init__(self) -> None:
        settings = get_settings()
        self.client = OpenAI(
            base_url="https://api.groq.com/openai/v1",
            api_key=settings.groq_api_key,
        ) if settings.groq_api_key else None
        self.model = settings.groq_model

    def answer(self, question: str, contexts: list[dict]) -> str:
        if self.client:
            return self._try_groq(question, contexts)
        return self._placeholder_answer(question, contexts)

    def _try_groq(self, question: str, contexts: list[dict]) -> str:
        context_text = "\n\n".join(
            f"[{item['metadata'].get('filename')} p.{item['metadata'].get('page')}] {item['text']}"
            for item in contexts
        )

        system_prompt = (
            "You are DocuTrust, an enterprise document QA assistant. "
            "Answer using only the supplied context and cite page numbers. "
            "If the context doesn't contain the answer, say so — don't make things up."
        )

        user_prompt = f"Context:\n{context_text}\n\nQuestion: {question}\nAnswer:"

        try:
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt},
                ],
                temperature=0.1,
                max_tokens=1024,
            )
            return response.choices[0].message.content.strip()
        except Exception as e:
            return f"Groq API error: {e}. Falling back to retrieved context."

    def _placeholder_answer(self, question: str, contexts: list[dict]) -> str:
        if not contexts:
            return "I could not find relevant document context. Upload a PDF first, then ask again."

        cited_pages = sorted(
            {
                f"{item['metadata'].get('filename')} page {item['metadata'].get('page')}"
                for item in contexts
            }
        )
        lead = contexts[0]["text"][:450].strip()
        return (
            "Groq API key is not configured. Set GROQ_API_KEY in .env. "
            f"For the question '{question}', the most relevant passage begins: {lead} "
            f"Sources considered: {', '.join(cited_pages)}."
        )
