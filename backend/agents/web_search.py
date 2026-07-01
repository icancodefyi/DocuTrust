from tavily import TavilyClient

from backend.config import get_settings


class WebSearch:
    def __init__(self) -> None:
        settings = get_settings()
        self.client = TavilyClient(api_key=settings.tavily_api_key) if settings.tavily_api_key else None

    def search(self, question: str, max_results: int = 3) -> list[dict]:
        if not self.client:
            return []

        try:
            response = self.client.search(
                query=question,
                max_results=max_results,
                search_depth="basic",
                include_answer=False,
            )
            results = response.get("results", [])
            return [
                {
                    "text": r["content"],
                    "metadata": {
                        "source": r["url"],
                        "filename": f"web: {r['title']}",
                        "page": 0,
                    },
                }
                for r in results
                if r.get("content")
            ]
        except Exception:
            return []
