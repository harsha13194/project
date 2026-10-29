from agents.base_agent import BaseAgent


class DeploymentAgent(BaseAgent):
    """Aggregates every agent's findings into an overall deployment readiness score."""
    role_prompt = (
        "You are the Deployment Readiness Agent, part of AI Codebase Intelligence.\n\n"
        "Responsibilities:\n"
        "- Synthesize architecture, impact, and refactoring findings from the context "
        "provided into an overall deployment readiness assessment.\n"
        "- Separate findings into critical issues and minor issues.\n"
        "- Give a clear go/no-go recommendation.\n\n"
        "Rules:\n"
        "- Ground every issue strictly in the findings and code context provided.\n"
        "- Never invent issues that aren't shown to you.\n"
        "- If the provided context doesn't cover the question, say so plainly instead of guessing."
    )


deployment_agent = DeploymentAgent()


def compute_readiness(metadata: dict) -> dict:
    """
    Deterministic score for the Deployment Readiness tab — doesn't need
    an LLM call, just aggregates what the parser and dependency graph
    already found. Powers GET /api/analysis/deploy directly.
    """
    critical, minor = [], []

    cycles = metadata.get("circular_dependencies", [])
    for cycle in cycles:
        critical.append(f"Circular dependency: {' -> '.join(cycle)}")

    functions_without_docs = [
        e for e in metadata["entities"]
        if e["type"] == "function" and not e["name"].startswith("_")
    ]
    if functions_without_docs:
        minor.append(f"{len(functions_without_docs)} public functions have no detected docstring")

    score = 100
    score -= 15 * len(critical)
    score -= 2 * len(minor)
    score = max(0, min(100, score))

    return {"score": score, "critical_issues": critical, "minor_issues": minor}
