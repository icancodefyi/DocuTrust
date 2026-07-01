@echo off
cd /d "%~dp0"

echo ================================================
echo  DocuTrust — Enterprise Advanced RAG Platform
echo ================================================
echo.

if not exist ".venv" (
    echo [1/3] Creating Python virtual environment...
    python -m venv .venv
)

echo [2/3] Installing dependencies...
.venv\Scripts\pip install -q -r requirements.txt

if not exist ".env" (
    echo [INFO] Creating .env from .env.example...
    copy .env.example .env
    echo [WARN] Edit .env and set GROQ_API_KEY + TAVILY_API_KEY before using chat.
)

echo [3/3] Starting DocuTrust on http://127.0.0.1:8000
echo.
.venv\Scripts\python -m uvicorn backend.main:app --reload --host 0.0.0.0 --port 8000

pause
