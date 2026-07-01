from fastapi import FastAPI, Request
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from fastapi.middleware.cors import CORSMiddleware
from routers.upload import router as upload_router
from routers.chat import router as chat_router

app = FastAPI(title="DocuTrust")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(upload_router, prefix="/api")
app.include_router(chat_router, prefix="/api")

templates = Jinja2Templates(directory="templates")
app.mount("/static", StaticFiles(directory="static"), name="static")    


@app.get("/")
def index(request: Request):
    return templates.TemplateResponse("index.html", {"request": request})
