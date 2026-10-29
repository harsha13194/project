"""
These endpoints power the six tabs on the frontend (Repository Summary,
Impact Analysis, Architecture, Documentation, Refactoring, Deployment
Readiness). They're deterministic aggregations over the already-parsed
metadata rather than fresh LLM calls on every tab switch, so switching
tabs stays instant. For a deeper, natural-language explanation of any
of these, the user just asks the AI Assistant — that goes through the
orchestrator (see chat.py) and hits the matching agent.
"""
from pathlib import Path
from fastapi import APIRouter, Query, Header, HTTPException
from workspace.repository_manager import repository_manager
from repository_parser.dependency_parser import find_callers
from agents.deployment_agent import compute_readiness

router = APIRouter(prefix="/api/analysis", tags=["analysis"])


def get_sid(x_session_id: str | None) -> str:
    return x_session_id if x_session_id else "default"


def get_metadata(sid: str) -> dict:
    try:
        return repository_manager.require_loaded(sid)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.get("/summary")
def summary(x_session_id: str | None = Header(None)):
    sid = get_sid(x_session_id)
    metadata = get_metadata(sid)
    top_level = sorted({Path(f["path"]).parts[0] for f in metadata["files"] if Path(f["path"]).parts})
    return {"stats": metadata["stats"], "top_level_folders": top_level}


@router.get("/impact")
def impact(file: str = Query(..., description="Repo-relative file path to simulate changing"), x_session_id: str | None = Header(None)):
    sid = get_sid(x_session_id)
    metadata = get_metadata(sid)
    callers = find_callers(metadata["dependency_graph"], file)
    rows = []
    for caller in callers:
        n = len(metadata["dependency_graph"].get(caller, []))
        risk = "High" if n >= 4 else "Medium" if n >= 2 else "Low"
        rows.append({"file": caller, "reason": f"Imports {file}", "risk": risk})
    return {"changed_file": file, "affected": rows}


@router.get("/architecture")
def architecture(x_session_id: str | None = Header(None)):
    sid = get_sid(x_session_id)
    metadata = get_metadata(sid)
    top_level = sorted({Path(f["path"]).parts[0] for f in metadata["files"] if Path(f["path"]).parts})
    violations = [
        {"type": "circular_dependency", "detail": " -> ".join(cycle)}
        for cycle in metadata["circular_dependencies"]
    ]
    return {"layers": top_level, "violations": violations}


@router.get("/docs")
def docs(x_session_id: str | None = Header(None)):
    sid = get_sid(x_session_id)
    metadata = get_metadata(sid)
    candidates = [
        {"name": e["name"], "file": e["file"], "type": e["type"]}
        for e in metadata["entities"]
        if not e["name"].startswith("_")
    ][:20]
    return {"undocumented_candidates": candidates}


@router.get("/refactor")
def refactor(x_session_id: str | None = Header(None)):
    sid = get_sid(x_session_id)
    metadata = get_metadata(sid)
    smells = []

    for e in metadata["entities"]:
        if e["type"] == "function" and len(e.get("args", [])) > 4:
            smells.append({"title": "Long parameter list", "detail": f"{e['name']}() in {e['file']} takes {len(e['args'])} args"})

    seen = {}
    for e in metadata["entities"]:
        if e["type"] != "function":
            continue
        seen.setdefault(e["name"], []).append(e["file"])
    for name, files in seen.items():
        if len(files) > 1:
            smells.append({"title": "Possible duplicate logic", "detail": f"`{name}` defined in {len(files)} files: {', '.join(files)}"})

    return {"smells": smells[:20]}


@router.get("/deploy")
def deploy(x_session_id: str | None = Header(None)):
    sid = get_sid(x_session_id)
    metadata = get_metadata(sid)
    return compute_readiness(metadata)


