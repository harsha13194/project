# AI Codebase Intelligence — Backend

FastAPI backend implementing the project's AI processing flow:

```
clone/upload -> repository_parser -> metadata extraction
             -> embeddings (temporary, per-repo)
             -> orchestrator -> agent -> explainable response
```

## Setup

```bash
cd backend
python -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate
pip install -r requirements.txt
```

`.env` is already filled in with your NVIDIA API key for local dev.
**Do not commit it** — it's already in `.gitignore`. Regenerate the key
on build.nvidia.com if it's ever been shared outside your machine.

## Run

```bash
uvicorn main:app --reload --port 8000
```

API docs: http://localhost:8000/docs

## Endpoints

| Method | Path                    | Purpose                                   |
|--------|-------------------------|--------------------------------------------|
| POST   | /api/repository/clone   | `{ "git_url": "..." }` — clone + index    |
| POST   | /api/repository/upload  | multipart `.zip` upload — extract + index |
| GET    | /api/repository/tree    | folder/file tree for the sidebar          |
| GET    | /api/repository/file?path=  | file content for the code editor      |
| GET    | /api/repository/stats   | file/class/function/language counts       |
| POST   | /api/chat                | `{ "query": "..." }` — routed to the correct agent, returns Answer/Reason/Evidence/Impact/Recommendation |
| GET    | /api/analysis/summary   | Repository Summary tab                    |
| GET    | /api/analysis/impact?file=   | Impact Analysis tab                  |
| GET    | /api/analysis/architecture | Architecture tab                        |
| GET    | /api/analysis/docs      | Documentation tab                         |
| GET    | /api/analysis/refactor  | Refactoring tab                           |
| GET    | /api/analysis/deploy    | Deployment Readiness tab (score + issues) |

## Notes / next steps

- **Parsing**: Python uses a real `ast` parse; JS/TS use regex (good
  enough for names/imports, not a full parser). Swap in `tree-sitter`
  inside `repository_parser/metadata_extractor.py` for multi-language
  accuracy later.
- **Embeddings**: in-memory, cleared on every new clone/upload — matches
  the "temporary storage only" requirement. Swap `embeddings/embedding_store.py`
  for a real vector DB if you need to keep multiple repos indexed at once.
- **Routing**: the orchestrator uses keyword matching for speed
  (`agents/orchestrator.py: classify_intent`). An LLM-based classifier
  is a drop-in replacement if keyword matching misses too often.
- **Analysis tabs** are deterministic (no LLM call) so switching tabs is
  instant; the AI Assistant chat is where LLM-backed explanations happen.
