import sqlite3
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from backend.config import get_settings


class MetadataStore:
    def __init__(self) -> None:
        self.settings = get_settings()
        self.mongo_collection = None
        self.using_mongo = False

        if self.settings.mongo_uri:
            try:
                from pymongo import MongoClient

                client = MongoClient(self.settings.mongo_uri, serverSelectionTimeoutMS=1500)
                client.admin.command("ping")
                db = client[self.settings.mongo_database]
                self.mongo_collection = db["documents"]
                self.using_mongo = True
            except Exception:
                self.mongo_collection = None
                self.using_mongo = False

        if not self.using_mongo:
            self._init_sqlite(self.settings.sqlite_path)
            self._init_traces_sqlite()

    def _init_traces_sqlite(self) -> None:
        db_path = self.settings.sqlite_path.parent / "traces.db"
        db_path.parent.mkdir(parents=True, exist_ok=True)
        with sqlite3.connect(db_path) as connection:
            connection.execute(
                """
                CREATE TABLE IF NOT EXISTS traces (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    client_id TEXT NOT NULL,
                    question TEXT NOT NULL,
                    rewritten_question TEXT,
                    answer TEXT NOT NULL,
                    chunks_retrieved INTEGER DEFAULT 0,
                    chunks_passed INTEGER DEFAULT 0,
                    web_fallback INTEGER DEFAULT 0,
                    model_used TEXT DEFAULT 'groq',
                    timestamp TEXT NOT NULL
                )
                """
            )
            connection.commit()

    def _init_sqlite(self, db_path: Path) -> None:
        db_path.parent.mkdir(parents=True, exist_ok=True)
        with sqlite3.connect(db_path) as connection:
            connection.execute(
                """
                CREATE TABLE IF NOT EXISTS documents (
                    document_id TEXT PRIMARY KEY,
                    filename TEXT NOT NULL,
                    stored_filename TEXT NOT NULL,
                    pages INTEGER NOT NULL,
                    chunks INTEGER NOT NULL,
                    uploaded_at TEXT NOT NULL
                )
                """
            )
            connection.commit()

    def save_document(self, metadata: dict[str, Any]) -> None:
        if self.using_mongo and self.mongo_collection is not None:
            self.mongo_collection.update_one(
                {"document_id": metadata["document_id"]},
                {"$set": metadata},
                upsert=True,
            )
            return

        with sqlite3.connect(self.settings.sqlite_path) as connection:
            connection.execute(
                """
                INSERT OR REPLACE INTO documents
                (document_id, filename, stored_filename, pages, chunks, uploaded_at)
                VALUES (?, ?, ?, ?, ?, ?)
                """,
                (
                    metadata["document_id"],
                    metadata["filename"],
                    metadata["stored_filename"],
                    metadata["pages"],
                    metadata["chunks"],
                    metadata["uploaded_at"],
                ),
            )
            connection.commit()

    def save_trace(self, trace: dict[str, Any]) -> None:
        trace["timestamp"] = utc_now_iso()
        if self.using_mongo and self.mongo_collection is not None:
            self.mongo_collection.database["traces"].insert_one(trace)
            return

        db_path = self.settings.sqlite_path.parent / "traces.db"
        with sqlite3.connect(db_path) as connection:
            connection.execute(
                """
                INSERT INTO traces
                (client_id, question, rewritten_question, answer,
                 chunks_retrieved, chunks_passed, web_fallback, model_used, timestamp)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    trace["client_id"],
                    trace["question"],
                    trace.get("rewritten_question", ""),
                    trace["answer"],
                    trace.get("chunks_retrieved", 0),
                    trace.get("chunks_passed", 0),
                    1 if trace.get("web_fallback") else 0,
                    trace.get("model_used", "groq"),
                    trace["timestamp"],
                ),
            )
            connection.commit()

    def list_documents(self) -> list[dict[str, Any]]:
        if self.using_mongo and self.mongo_collection is not None:
            return list(self.mongo_collection.find({}, {"_id": 0}).sort("uploaded_at", -1))

        with sqlite3.connect(self.settings.sqlite_path) as connection:
            connection.row_factory = sqlite3.Row
            rows = connection.execute("SELECT * FROM documents ORDER BY uploaded_at DESC").fetchall()
            return [dict(row) for row in rows]


def utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()
