#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")"

echo "================================================"
echo " DocuTrust — Enterprise Advanced RAG Platform"
echo "================================================"
echo ""

# ── Python venv ──────────────────────────────────────
if [ ! -d ".venv" ]; then
    echo "[1/3] Creating Python virtual environment..."
    python3 -m venv .venv
fi

source .venv/bin/activate

# ── Dependencies ─────────────────────────────────────
echo "[2/3] Installing dependencies..."
pip install -q -r requirements.txt

# ── Start server ─────────────────────────────────────
echo "[3/3] Starting DocuTrust on http://127.0.0.1:8000"
echo ""
uvicorn backend.main:app --reload --host 0.0.0.0 --port 8000
