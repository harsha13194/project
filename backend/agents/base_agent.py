from llm.nvidia_client import chat_json

EXPLAIN_FORMAT = """
Respond with a single JSON object containing exactly these five keys:
- "answer": a direct answer to the developer's question, in 1-2 sentences.
- "reason": why that's the answer, grounded in the repository's actual structure.
- "evidence": specific file names, line numbers, or code references that support it.
- "impact": what this implies for the codebase — downstream effects or risk.
- "recommendation": one concrete, actionable next step.

All five keys are required in every response, even when a field is brief.
Do not include any text, markdown, or commentary outside the JSON object.
"""


class BaseAgent:
    """
    Every agent shares the same explainable-response contract so the
    frontend's ExplainCard can render any agent's output identically.
    Subclasses only need to define `role_prompt`.
    """
    role_prompt: str = "You are a helpful software engineering assistant."

    def respond(self, query: str, context: str) -> dict:
        system_prompt = f"{self.role_prompt}\n\n{EXPLAIN_FORMAT}"
        user_prompt = f"Repository context:\n{context}\n\nDeveloper question:\n{query}"
        result = chat_json(system_prompt, user_prompt)
        result.setdefault("agent", self.__class__.__name__)
        return result
