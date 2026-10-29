"""
The single source of truth for "what repository is currently loaded".
Ties together: clone/upload -> parse -> embed -> ready for agents.
Everything else (routes, agents) asks this module for repo state
instead of touching the filesystem or the embedding store directly.
"""
import json
from pathlib import Path
from core.config import settings
from core.logger import get_logger
from repository_parser.project_scanner import scan_project
from embeddings.embedding_store import embedding_store

logger = get_logger(__name__)


class RepositoryManager:
    def __init__(self):
        # session_id -> {"root_path": Path, "metadata": dict}
        self._sessions: dict[str, dict] = {}

    def _session_file(self, session_id: str) -> Path:
        clean_sid = "".join(c for c in session_id if c.isalnum() or c in ("-", "_"))
        return settings.repositories_dir / f"session_{clean_sid}.json"

    def is_loaded(self, session_id: str = "default") -> bool:
        return self.get(session_id) is not None

    def load(self, root_path: Path, session_id: str = "default") -> dict:
        """Runs the full ingest pipeline for a freshly cloned/uploaded repo for a specific session."""
        logger.info(f"[{session_id}] Loading repository at {root_path}")
        metadata = scan_project(root_path)

        self._sessions[session_id] = {
            "root_path": root_path,
            "metadata": metadata
        }

        # Save session metadata to disk for persistence across server reboots
        try:
            sf = self._session_file(session_id)
            sf.write_text(json.dumps({"root_path": str(root_path), "metadata": metadata}), encoding="utf-8")
        except Exception as e:
            logger.warning(f"Failed to persist session metadata to disk: {e}")

        # Replace embeddings for this session
        embedding_store.clear(session_id)
        embedding_store.index_repository(metadata, session_id=session_id)

        logger.info(
            f"[{session_id}] Repository ready: {metadata['stats']['file_count']} files, "
            f"{len(metadata['entities'])} entities indexed"
        )
        return metadata

    def get(self, session_id: str = "default") -> dict | None:
        if session_id in self._sessions and self._sessions[session_id].get("metadata") is not None:
            return self._sessions[session_id]["metadata"]

        # Attempt to restore session state from disk
        sf = self._session_file(session_id)
        if sf.exists():
            try:
                data = json.loads(sf.read_text(encoding="utf-8"))
                root_path = Path(data["root_path"])
                metadata = data["metadata"]
                self._sessions[session_id] = {
                    "root_path": root_path,
                    "metadata": metadata
                }
                embedding_store.index_repository(metadata, session_id=session_id)
                logger.info(f"[{session_id}] Restored session metadata from disk.")
                return metadata
            except Exception as e:
                logger.warning(f"Failed to restore session from disk: {e}")

        return None

    def require_loaded(self, session_id: str = "default") -> dict:
        metadata = self.get(session_id)
        if metadata is None:
            raise ValueError("No repository loaded yet for this session. Clone or upload one first.")
        return metadata

    def reset(self, session_id: str = "default"):
        """Clears session workspace metadata and vectors."""
        if session_id in self._sessions:
            del self._sessions[session_id]
        sf = self._session_file(session_id)
        if sf.exists():
            sf.unlink(missing_ok=True)
        embedding_store.clear(session_id)
        logger.info(f"[{session_id}] Session workspace reset.")


repository_manager = RepositoryManager()


