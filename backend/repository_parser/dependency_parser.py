"""
Builds a file-to-file dependency graph from each file's import list.
This is what Impact Analysis and Architecture agents walk to find
callers/callees and circular dependencies.
"""
from pathlib import Path


def build_dependency_graph(files_metadata: list[dict]) -> dict:
    """
    files_metadata: list of {"path": str, "imports": [str, ...]}
    Returns {"path/to/file.py": ["path/to/other.py", ...]}, resolved
    only for imports that match another file in this repo (best-effort
    match on module name / filename stem — not a full resolver).
    """
    stem_to_path = {Path(f["path"]).stem: f["path"] for f in files_metadata}
    graph: dict[str, list[str]] = {}

    for f in files_metadata:
        deps = []
        for imp in f.get("imports", []):
            candidate = imp.split(".")[-1]
            if candidate in stem_to_path and stem_to_path[candidate] != f["path"]:
                deps.append(stem_to_path[candidate])
        graph[f["path"]] = sorted(set(deps))

    return graph


def find_callers(graph: dict, target_file: str) -> list[str]:
    return sorted([f for f, deps in graph.items() if target_file in deps])


def find_cycles(graph: dict) -> list[list[str]]:
    """Simple DFS cycle detection — flags circular dependencies for the Architecture agent."""
    cycles = []
    visited, stack = set(), []

    def dfs(node):
        if node in stack:
            cycle = stack[stack.index(node):] + [node]
            if cycle not in cycles:
                cycles.append(cycle)
            return
        if node in visited:
            return
        visited.add(node)
        stack.append(node)
        for dep in graph.get(node, []):
            dfs(dep)
        stack.pop()

    for node in graph:
        dfs(node)
    return cycles
