"""
Thin wrapper around NVIDIA's OpenAI-compatible NIM API.
Every agent and the embedding generator goes through this module —
nothing else should import `openai` directly, so the provider can be
swapped later without touching agent code.
"""
import json
from openai import OpenAI
from core.config import settings
from core.logger import get_logger

logger = get_logger(__name__)


def _get_client() -> OpenAI:
    api_key = settings.nvidia_api_key or "dummy-key-for-init"
    return OpenAI(base_url=settings.nvidia_base_url, api_key=api_key)


def chat(system_prompt: str, user_prompt: str, temperature: float = 0.3, max_tokens: int = 800) -> str:
    """Single-turn completion. Returns raw text content."""
    try:
        client = _get_client()
        response = client.chat.completions.create(
            model=settings.nvidia_chat_model,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            temperature=temperature,
            max_tokens=max_tokens,
        )
        return response.choices[0].message.content or ""
    except Exception as e:
        logger.error(f"NVIDIA chat call failed: {e}")
        raise


def chat_json(system_prompt: str, user_prompt: str, temperature: float = 0.2, max_tokens: int = 800) -> dict:
    """
    Same as chat(), but instructs the model to return strict JSON and
    parses it. Falls back to a best-effort wrapper if parsing or API fails,
    so a model error never crashes the request.
    """
    strict_system = (
        system_prompt
        + "\n\nRespond with ONLY a single valid JSON object. No markdown fences, no preamble."
    )
    try:
        raw = chat(strict_system, user_prompt, temperature=temperature, max_tokens=max_tokens)
    except Exception as e:
        logger.warning(f"LLM call failed: {e}. Returning fallback response.")
        return {
            "answer": "Unable to complete LLM query with NVIDIA API.",
            "reason": f"API call failed: {str(e)}",
            "evidence": "Check backend/.env for NVIDIA_API_KEY setting.",
            "impact": "LLM response generation unavailable.",
            "recommendation": "Set a valid NVIDIA_API_KEY in backend/.env file and restart the server.",
        }

    cleaned = raw.strip().removeprefix("```json").removeprefix("```").removesuffix("```").strip()
    try:
        return json.loads(cleaned)
    except json.JSONDecodeError:
        logger.warning("Model did not return valid JSON, wrapping raw text.")
        return {
            "answer": cleaned or "The model did not return a structured response.",
            "reason": "Response could not be parsed as JSON.",
            "evidence": "",
            "impact": "Unknown",
            "recommendation": "Retry the query, or simplify it.",
        }


def embed(texts: list[str]) -> list[list[float]]:
    """Returns one embedding vector per input text."""
    if not texts:
        return []
    try:
        client = _get_client()
        response = client.embeddings.create(
            model=settings.nvidia_embed_model,
            input=texts,
            extra_body={"input_type": "passage"},
        )
        return [d.embedding for d in response.data]
    except Exception as e:
        logger.error(f"NVIDIA embedding call failed: {e}")
        raise

