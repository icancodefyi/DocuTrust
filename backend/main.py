from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates

from backend.config import BASE_DIR, get_settings
from backend.routers import chat, health, upload


settings = get_settings()
frontend_dir = BASE_DIR / "frontend"
templates = Jinja2Templates(directory=str(frontend_dir / "templates"))


@asynccontextmanager
async def lifespan(app: FastAPI):
    settings.uploads_dir.mkdir(parents=True, exist_ok=True)
    settings.chroma_dir.mkdir(parents=True, exist_ok=True)
    settings.sqlite_path.parent.mkdir(parents=True, exist_ok=True)
    yield


app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount("/static", StaticFiles(directory=str(frontend_dir / "static")), name="static")
app.include_router(health.router)
app.include_router(upload.router)
app.include_router(chat.router)


@app.get("/", response_class=HTMLResponse)
def index(request: Request):
    return templates.TemplateResponse("index.html", {"request": request})


@app.get("/app", response_class=HTMLResponse)
def app_home(request: Request):
    return templates.TemplateResponse("index.html", {"request": request})
