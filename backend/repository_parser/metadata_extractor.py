"""
Per-file structural extraction. Python gets a real AST parse (accurate).
JS/TS/others get a lightweight regex pass — good enough to power search
and explanations, not a full compiler front-end. Swap in tree-sitter
here later without changing anything upstream (tree_parser.py is the
integration point that calls this module).
"""
import ast
import re
from pathlib import Path

JS_FUNCTION_RE = re.compile(r"\bfunction\s+([A-Za-z0-9_]+)\s*\(")
JS_ARROW_RE = re.compile(r"\b(?:const|let|var)\s+([A-Za-z0-9_]+)\s*=\s*(?:async\s*)?\([^)]*\)\s*=>")
JS_CLASS_RE = re.compile(r"\bclass\s+([A-Za-z0-9_]+)")
JS_IMPORT_RE = re.compile(r"import\s+.*?from\s+['\"]([^'\"]+)['\"]")


def extract_python(source: str, file_path: str) -> dict:
    entities = {"classes": [], "functions": [], "imports": []}
    try:
        tree = ast.parse(source)
    except SyntaxError:
        return entities

    for node in ast.walk(tree):
        if isinstance(node, ast.ClassDef):
            methods = [n.name for n in node.body if isinstance(n, (ast.FunctionDef, ast.AsyncFunctionDef))]
            entities["classes"].append({
                "name": node.name, "line": node.lineno, "methods": methods, "file": file_path,
            })
        elif isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)) and _is_top_level(node, tree):
            entities["functions"].append({
                "name": node.name, "line": node.lineno,
                "args": [a.arg for a in node.args.args], "file": file_path,
            })
        elif isinstance(node, ast.Import):
            entities["imports"].extend(alias.name for alias in node.names)
        elif isinstance(node, ast.ImportFrom) and node.module:
            entities["imports"].append(node.module)

    return entities


def _is_top_level(node, tree) -> bool:
    """Skip methods already captured under their class."""
    for parent in ast.walk(tree):
        if isinstance(parent, ast.ClassDef) and node in parent.body:
            return False
    return True


def extract_javascript(source: str, file_path: str) -> dict:
    entities = {"classes": [], "functions": [], "imports": []}
    for m in JS_CLASS_RE.finditer(source):
        entities["classes"].append({"name": m.group(1), "line": _line_of(source, m.start()), "methods": [], "file": file_path})
    for m in JS_FUNCTION_RE.finditer(source):
        entities["functions"].append({"name": m.group(1), "line": _line_of(source, m.start()), "args": [], "file": file_path})
    for m in JS_ARROW_RE.finditer(source):
        entities["functions"].append({"name": m.group(1), "line": _line_of(source, m.start()), "args": [], "file": file_path})
    for m in JS_IMPORT_RE.finditer(source):
        entities["imports"].append(m.group(1))
    return entities


def _line_of(source: str, index: int) -> int:
    return source.count("\n", 0, index) + 1


def extract_metadata(source: str, file_path: str, language: str | None) -> dict:
    if language == "python":
        return extract_python(source, file_path)
    if language in ("javascript", "typescript"):
        return extract_javascript(source, file_path)
    return {"classes": [], "functions": [], "imports": []}
