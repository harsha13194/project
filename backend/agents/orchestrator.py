"""
The only entry point the API layer calls for chat. It classifies
intent with a fast keyword heuristic (no extra LLM round-trip needed
for routing) and dispatches to the matching agent. Swap `classify_intent`
for an LLM-based classifier later without touching any agent or route.
"""
from agents.codebase_agent import codebase_agent
from agents.impact_agent import impact_agent
from agents.architecture_agent import architecture_agent
from agents.documentation_agent import documentation_agent
from agents.refactoring_agent import refactoring_agent
from agents.deployment_agent import deployment_agent
from knowledge.context_manager import build_context
from core.logger import get_logger

logger = get_logger(__name__)

_INTENT_KEYWORDS = {
    "impact": impact_agent,
    "affect": impact_agent,
    "risk": impact_agent,
    "if i modify": impact_agent,
    "if i change": impact_agent,
    "architecture": architecture_agent,
    "layer": architecture_agent,
    "circular": architecture_agent,
    "dependency": architecture_agent,
    "document": documentation_agent,
    "docstring": documentation_agent,
    "readme": documentation_agent,
    "comment": documentation_agent,
    "refactor": refactoring_agent,
    "duplicate": refactoring_agent,
    "dead code": refactoring_agent,
    "code smell": refactoring_agent,
    "deploy": deployment_agent,
    "ready": deployment_agent,
    "readiness": deployment_agent,
}

_DEFAULT_AGENT = codebase_agent


def classify_intent(query: str):
    lowered = query.lower()
    for keyword, agent in _INTENT_KEYWORDS.items():
        if keyword in lowered:
            return agent
    return _DEFAULT_AGENT


def route(query: str, metadata: dict, session_id: str = "default") -> dict:
    agent = classify_intent(query)
    context = build_context(query, metadata, session_id=session_id)
    logger.info(f"Routed query to {agent.__class__.__name__} for session [{session_id}]")
    return agent.respond(query, context)
