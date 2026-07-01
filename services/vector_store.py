from functools import lru_cache
from pathlib import Path

import chromadb
from chromadb.config import Settings


@lru_cache(maxsize=1)
def get_chroma_client(persist_directory: str = "./chroma_db") -> chromadb.ClientAPI:
    path = Path(persist_directory)
    path.mkdir(parents=True, exist_ok=True)
    return chromadb.PersistentClient(
        path=str(path),
        settings=Settings(anonymized_telemetry=False),
    )


class VectorStore:
    def __init__(self, persist_directory: str = "./chroma_db", collection_name: str = "documents"):
        self.persist_directory = persist_directory
        self.client = get_chroma_client(persist_directory)
        self.collection = self.client.get_or_create_collection(collection_name)

    def add_documents(self, ids, embeddings, metadatas, documents):
        self.collection.add(ids=ids, embeddings=embeddings, metadatas=metadatas, documents=documents)

    def query(self, query_embedding, n_results: int = 3):
        res = self.collection.query(
            query_embeddings=[query_embedding],
            n_results=n_results,
            include=["metadatas", "documents"],
        )
        results = []
        if res and "metadatas" in res and len(res["metadatas"]) > 0:
            for md, doc in zip(res["metadatas"][0], res["documents"][0], strict=False):
                results.append({"metadata": md, "document": doc})
        return results
