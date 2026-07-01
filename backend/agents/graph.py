from typing import Any, Literal, TypedDict

from langgraph.graph import END, StateGraph

from backend.agents.grader import RelevanceGrader
from backend.agents.rewriter import QueryRewriter
from backend.agents.web_search import WebSearch
from backend.config import get_settings
from backend.services.embedding_service import get_embedding_service
from backend.services.llm_service import LLMService
from backend.services.vector_store import VectorStore


class CRAGState(TypedDict):
    question: str
    rewritten_question: str
    chunks: list[dict]
    passed_chunks: list[dict]
    failed_chunks: list[dict]
    web_chunks: list[dict]
    answer: str
    citations: list[dict]
    retry_count: int
    steps: list[dict]


class CRAGPipeline:
    def __init__(self) -> None:
        self.settings = get_settings()
        self.vector_store = VectorStore()
        self.embedding_service = get_embedding_service()
        self.grader = RelevanceGrader()
        self.rewriter = QueryRewriter()
        self.web_search = WebSearch()
        self.llm = LLMService()
        self.graph = self._build_graph()

    def _retrieve(self, state: CRAGState) -> dict:
        query = state.get("rewritten_question") or state["question"]
        q_emb = self.embedding_service.embed_query(query)
        chunks = self.vector_store.search(q_emb, top_k=self.settings.default_top_k)

        step = {
            "agent": "retriever",
            "status": "done",
            "detail": f"Retrieved {len(chunks)} chunks from vector store",
        }
        return {"chunks": chunks, "steps": [step]}

    def _grade(self, state: CRAGState) -> dict:
        question = state.get("rewritten_question") or state["question"]
        chunks = state["chunks"]

        passed, failed = self.grader.grade(question, chunks)

        step = {
            "agent": "grader",
            "status": "done",
            "detail": f"{len(passed)}/{len(chunks)} chunks passed relevance threshold",
        }
        return {"passed_chunks": passed, "failed_chunks": failed, "steps": [step]}

    def _rewrite(self, state: CRAGState) -> dict:
        question = state["question"]
        rewritten = self.rewriter.rewrite(question, state["failed_chunks"])

        step = {
            "agent": "rewriter",
            "status": "done",
            "detail": f"Rewrote query: '{rewritten[:80]}...'",
        }
        return {
            "rewritten_question": rewritten,
            "retry_count": state.get("retry_count", 0) + 1,
            "steps": [step],
        }

    def _web_search(self, state: CRAGState) -> dict:
        question = state.get("rewritten_question") or state["question"]
        results = self.web_search.search(question)

        step = {
            "agent": "web_search",
            "status": "done",
            "detail": f"Found {len(results)} web results",
        }
        return {"web_chunks": results, "steps": [step]}

    def _generate(self, state: CRAGState) -> dict:
        all_contexts = state["passed_chunks"] + state["web_chunks"]
        if not all_contexts:
            all_contexts = state["chunks"]

        question = state.get("rewritten_question") or state["question"]
        answer = self.llm.answer(question, all_contexts)

        citations = []
        for item in all_contexts:
            meta = item.get("metadata", {})
            citations.append({
                "document_id": meta.get("document_id", ""),
                "filename": meta.get("filename", "Unknown"),
                "page": int(meta.get("page", 0)),
                "chunk_id": item.get("id", ""),
                "score": item.get("relevance_score"),
                "excerpt": item["text"][:320],
            })

        step = {
            "agent": "generator",
            "status": "done",
            "detail": f"Generated answer from {len(all_contexts)} context items",
        }
        return {"answer": answer, "citations": citations, "steps": [step]}

    def _decide_after_grade(self, state: CRAGState) -> Literal["generate", "rewrite", "web_search"]:
        if len(state["passed_chunks"]) >= 2:
            return "generate"

        if state["retry_count"] < self.settings.max_retries:
            return "rewrite"

        return "web_search"

    def _build_graph(self) -> StateGraph:
        workflow = StateGraph(CRAGState)

        workflow.add_node("retrieve", self._retrieve)
        workflow.add_node("grade", self._grade)
        workflow.add_node("rewrite", self._rewrite)
        workflow.add_node("web_search", self._web_search)
        workflow.add_node("generate", self._generate)

        workflow.set_entry_point("retrieve")

        workflow.add_edge("retrieve", "grade")
        workflow.add_edge("rewrite", "retrieve")
        workflow.add_edge("web_search", "generate")
        workflow.add_edge("generate", END)

        workflow.add_conditional_edges(
            "grade",
            self._decide_after_grade,
            {
                "generate": "generate",
                "rewrite": "rewrite",
                "web_search": "web_search",
            },
        )

        return workflow.compile()

    def run(self, question: str) -> dict[str, Any]:
        initial: CRAGState = {
            "question": question,
            "rewritten_question": "",
            "chunks": [],
            "passed_chunks": [],
            "failed_chunks": [],
            "web_chunks": [],
            "answer": "",
            "citations": [],
            "retry_count": 0,
            "steps": [],
        }

        result = self.graph.invoke(initial)
        return {
            "answer": result.get("answer", "No answer generated."),
            "citations": result.get("citations", []),
            "steps": result.get("steps", []),
        }
