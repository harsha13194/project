from core.constants import CHUNK_LINES
from llm.nvidia_client import embed


def chunk_file(path: str, source: str) -> list[dict]:
    """Splits a file's source into fixed-size line chunks for embedding."""
    lines = source.splitlines()
    chunks = []
    for i in range(0, len(lines), CHUNK_LINES):
        text = "\n".join(lines[i:i + CHUNK_LINES]).strip()
        if not text:
            continue
        chunks.append({
            "file": path,
            "start_line": i + 1,
            "end_line": min(i + CHUNK_LINES, len(lines)),
            "text": text,
        })
    return chunks


def generate_embeddings(chunks: list[dict]) -> list[list[float]]:
    """Batches the NVIDIA embedding call across all chunks."""
    if not chunks:
        return []
    batch_size = 64
    vectors: list[list[float]] = []
    for i in range(0, len(chunks), batch_size):
        batch = [c["text"] for c in chunks[i:i + batch_size]]
        vectors.extend(embed(batch))
    return vectors
