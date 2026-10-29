from fastapi import APIRouter, HTTPException, Header
from api.schemas.models import ChatRequest
from workspace.repository_manager import repository_manager
from agents.orchestrator import route

router = APIRouter(prefix="/api/chat", tags=["chat"])


@router.post("")
def chat(req: ChatRequest, x_session_id: str | None = Header(None)):
    sid = x_session_id if x_session_id else "default"
    try:
        metadata = repository_manager.require_loaded(sid)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    try:
        result = route(req.query, metadata, session_id=sid)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"AI request failed: {e}")

    return result

