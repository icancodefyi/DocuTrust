from __future__ import annotations

import shutil
import subprocess


class LLMService:
    def answer(self, question: str, contexts: list[dict]) -> str:
        prompt = self._build_prompt(question, contexts)
        local_answer = self._try_ollama(prompt)
        if local_answer:
            return local_answer
        return self._placeholder_answer(question, contexts)

    def _try_ollama(self, prompt: str) -> str | None:
        if shutil.which("ollama") is None:
            return None

        try:
            completed = subprocess.run(
                ["ollama", "run", "llama3.1", prompt],
                capture_output=True,
                text=True,
                timeout=45,
                check=False,
            )
        except Exception:
            return None

        if completed.returncode != 0:
            return None
        answer = completed.stdout.strip()
        return answer or None

    def _build_prompt(self, question: str, contexts: list[dict]) -> str:
        context_text = "\n\n".join(
            f"[{item['metadata'].get('filename')} p.{item['metadata'].get('page')}] {item['text']}"
            for item in contexts
        )
        return (
            "You are DocuTrust, an enterprise document QA assistant. "
            "Answer using only the supplied context and cite page numbers.\n\n"
            f"Context:\n{context_text}\n\nQuestion: {question}\nAnswer:"
        )

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
            "Local LLM generation is not available, so this is a retrieval-grounded placeholder. "
            f"For the question '{question}', the most relevant passage begins: {lead} "
            f"Sources considered: {', '.join(cited_pages)}."
        )
