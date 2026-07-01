from functools import lru_cache
from pathlib import Path

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


BASE_DIR = Path(__file__).resolve().parents[1]


class Settings(BaseSettings):
    app_name: str = "DocuTrust: Enterprise Advanced RAG Platform"
    app_version: str = "1.0.0"
    environment: str = Field(default="development", alias="ENVIRONMENT")
    allowed_origins: list[str] = ["http://localhost:8000", "http://127.0.0.1:8000"]

    uploads_dir: Path = BASE_DIR / "uploads"
    chroma_dir: Path = BASE_DIR / "chroma_db"
    sqlite_path: Path = BASE_DIR / "data" / "metadata.db"

    mongo_uri: str | None = Field(default=None, alias="MONGO_URI")
    mongo_database: str = Field(default="docutrust", alias="MONGO_DATABASE")

    groq_api_key: str | None = Field(default=None, alias="GROQ_API_KEY")
    groq_model: str = Field(default="llama3-70b-8192", alias="GROQ_MODEL")

    embedding_model_name: str = "sentence-transformers/all-MiniLM-L6-v2"
    chroma_collection: str = "docutrust_documents"
    chunk_size: int = 900
    chunk_overlap: int = 180
    default_top_k: int = 5
    max_upload_mb: int = 25

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")


@lru_cache
def get_settings() -> Settings:
    return Settings()
