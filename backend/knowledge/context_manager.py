from embeddings.embedding_store import embedding_store


def build_context(query: str, metadata: dict, top_k: int = 5, session_id: str = "default") -> str:
    """
    Assembles the text block every agent sends to the LLM alongside its
    role prompt: the most relevant code chunks for this query, plus a
    light repo-level summary so agents aren't answering blind.
    """
    matches = embedding_store.search(query, top_k=top_k, session_id=session_id)

    summary = (
        f"Repository: {metadata['stats']['file_count']} files, "
        f"{metadata['stats']['class_count']} classes, "
        f"{metadata['stats']['function_count']} functions, "
        f"languages: {metadata['stats']['languages']}."
    )

    if not matches:
        return summary + "\n\n(No semantic matches found for this query.)"

    chunks_text = "\n\n".join(
        f"--- {m['file']} (lines {m['start_line']}-{m['end_line']}) ---\n{m['text']}"
        for m in matches
    )
    return f"{summary}\n\nMost relevant code:\n{chunks_text}"
