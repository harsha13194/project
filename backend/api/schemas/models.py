from pydantic import BaseModel


class CloneRequest(BaseModel):
    git_url: str


class ChatRequest(BaseModel):
    query: str


class ExplainableResponse(BaseModel):
    agent: str
    answer: str
    reason: str
    evidence: str
    impact: str
    recommendation: str


class RepositoryStats(BaseModel):
    file_count: int
    total_lines: int
    languages: dict
    class_count: int
    function_count: int
    dependency_count: int
