from pathlib import Path
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from core.config import settings
from core.logger import get_logger
from api.routes import repository, chat, analysis
from workspace.repository_manager import repository_manager

logger = get_logger(__name__)

app = FastAPI(
    title="AI Codebase Intelligence API",
    description="Repository parsing, temporary embeddings, and multi-agent explainable analysis.",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins for seamless local dev
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(repository.router)
app.include_router(chat.router)
app.include_router(analysis.router)


@app.get("/api/health")
def health():
    return {
        "status": "ok",
        "repository_loaded": repository_manager.is_loaded(),
    }


@app.on_event("startup")
def on_startup():
    if not settings.nvidia_api_key:
        logger.warning("NVIDIA_API_KEY is not set — chat and embedding calls will use fallback modes.")

    logger.info("AI Codebase Intelligence backend ready.")

