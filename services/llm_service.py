import os
from typing import List

def answer_with_llm(question: str, contexts: List[str]):
    """Try to use a local transformers text-generation model if LLM_MODEL env var is set.
    Otherwise return a placeholder answer synthesized from contexts."""
    model_name = os.environ.get("LLM_MODEL")
    prompt = "\n\n".join([f"Context {i+1}: {c}" for i, c in enumerate(contexts)])
    prompt = f"You are a helpful assistant. Use the following contexts to answer the question.\n\n{prompt}\n\nQuestion: {question}\nAnswer:"

    if model_name:
        try:
            from transformers import AutoModelForCausalLM, AutoTokenizer, pipeline
            tokenizer = AutoTokenizer.from_pretrained(model_name)
            model = AutoModelForCausalLM.from_pretrained(model_name)
            gen = pipeline("text-generation", model=model, tokenizer=tokenizer)
            out = gen(prompt, max_length=512, do_sample=False)
            return out[0]["generated_text"]
        except Exception:
            pass

    # Fallback: simple extractive placeholder
    if contexts:
        summary = "\n\n".join([c[:500].strip() for c in contexts])
        return f"[Placeholder answer built from retrieved context]\n\n{summary}\n\n(If you have a local LLM, set the LLM_MODEL environment variable to use it.)"
    return "I don't have enough information to answer that question."
