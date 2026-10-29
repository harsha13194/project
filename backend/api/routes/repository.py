from fastapi import APIRouter, UploadFile, File, HTTPException, Query, Header
from api.schemas.models import CloneRequest, RepositoryStats
from workspace.clone_repository import clone_repository
from workspace.upload_project import upload_project
from workspace.repository_manager import repository_manager

router = APIRouter(prefix="/api/repository", tags=["repository"])


def get_sid(x_session_id: str | None) -> str:
    return x_session_id if x_session_id else "default"


@router.post("/clone")
def clone(req: CloneRequest, x_session_id: str | None = Header(None)):
    sid = get_sid(x_session_id)
    try:
        path = clone_repository(req.git_url)
        metadata = repository_manager.load(path, session_id=sid)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    return {"message": "Repository cloned and indexed", "stats": metadata["stats"]}


@router.post("/upload")
async def upload(file: UploadFile = File(...), x_session_id: str | None = Header(None)):
    sid = get_sid(x_session_id)
    try:
        path = await upload_project(file)
        metadata = repository_manager.load(path, session_id=sid)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    return {"message": "Project uploaded and indexed", "stats": metadata["stats"]}


@router.post("/reset")
def reset_workspace(x_session_id: str | None = Header(None)):
    sid = get_sid(x_session_id)
    repository_manager.reset(sid)
    return {"message": "Session repository reset successfully"}


@router.get("/tree")
def get_tree(x_session_id: str | None = Header(None)):
    sid = get_sid(x_session_id)
    metadata = repository_manager.get(sid)
    if not metadata:
        raise HTTPException(status_code=404, detail="No repository loaded yet for this session")
    return metadata["tree"]


@router.get("/file")
def get_file(path: str = Query(...), x_session_id: str | None = Header(None)):
    sid = get_sid(x_session_id)
    try:
        metadata = repository_manager.require_loaded(sid)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

    norm_path = path.replace("\\", "/").strip("/")

    # Pass 1: exact repo-relative path match. This is what the frontend
    # always sends (the same path string returned by GET /tree), so it
    # must win outright — checked against every file before any fallback
    # runs, so it can never be pre-empted by a looser match below.
    for f in metadata["files"]:
        if f["path"].replace("\\", "/").strip("/") == norm_path:
            return {"path": f["path"], "language": f["language"], "content": f["source"]}

    # Pass 2: fallback for lookups that aren't a full repo-relative path
    # (e.g. a bare filename). Only reached if no exact match was found.
    for f in metadata["files"]:
        f_norm = f["path"].replace("\\", "/").strip("/")
        if (
            norm_path.endswith(f_norm)
            or f_norm.endswith(norm_path)
            or f_norm.split("/")[-1] == norm_path.split("/")[-1]
        ):
            return {"path": f["path"], "language": f["language"], "content": f["source"]}

    raise HTTPException(status_code=404, detail=f"File '{path}' not found in loaded repository")



@router.get("/stats", response_model=RepositoryStats)
def get_stats(x_session_id: str | None = Header(None)):
    sid = get_sid(x_session_id)
    try:
        metadata = repository_manager.require_loaded(sid)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    return metadata["stats"]


