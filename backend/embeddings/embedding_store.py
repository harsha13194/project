"""
Lightweight in-memory vector store — no external vector DB dependency,
which matches the "temporary storage, replaced per repository" rule
from the project spec. Good for single-repo, single-user workloads;
swap for a real vector DB later if the project needs to scale beyond
that without changing the call sites (index_repository / search).
"""
import numpy as np
from core.logger import get_logger
from embeddings.embedding_generator import chunk_file, generate_embeddings
from llm.nvidia_client import embed

logger = get_logger(__name__)


class EmbeddingStore:
    def __init__(self):
        # session_id -> {"vectors": np.ndarray | None, "chunks": list[dict]}
        self._sessions: dict[str, dict] = {}

    def _get_session(self, session_id: str) -> dict:
        if session_id not in self._sessions:
            self._sessions[session_id] = {"vectors": None, "chunks": []}
        return self._sessions[session_id]

    def clear(self, session_id: str = "default"):
        if session_id in self._sessions:
            del self._sessions[session_id]

    def index_repository(self, metadata: dict, session_id: str = "default"):
        """Chunks every file in the scan result and embeds them all for a session."""
        all_chunks = []
        for f in metadata["files"]:
            all_chunks.extend(chunk_file(f["path"], f["source"]))

        if not all_chunks:
            logger.warning(f"[{session_id}] No chunkable content found to embed.")
            return

        try:
            vectors = generate_embeddings(all_chunks)
        except Exception:
            logger.error(f"[{session_id}] Embedding generation failed — semantic search will be unavailable.")
            return

        sess = self._get_session(session_id)
        sess["chunks"] = all_chunks
        sess["vectors"] = np.array(vectors, dtype=np.float32)
        logger.info(f"[{session_id}] Indexed {len(all_chunks)} chunks into temporary vector store.")

    def search(self, query: str, top_k: int = 5, session_id: str = "default") -> list[dict]:
        sess = self._get_session(session_id)
        vectors = sess.get("vectors")
        chunks = sess.get("chunks", [])

        if vectors is None or len(chunks) == 0:
            return []
        try:
            [query_vec] = embed([query])
        except Exception:
            logger.error(f"[{session_id}] Query embedding failed.")
            return []

        q = np.array(query_vec, dtype=np.float32)
        sims = vectors @ q / (np.linalg.norm(vectors, axis=1) * np.linalg.norm(q) + 1e-8)
        top_indices = np.argsort(-sims)[:top_k]
        return [{**chunks[i], "score": float(sims[i])} for i in top_indices]


embedding_store = EmbeddingStore()

