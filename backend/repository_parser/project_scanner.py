from pathlib import Path
from collections import Counter
from repository_parser.file_loader import iter_source_files, read_text
from repository_parser.language_detector import detect_language
from repository_parser.metadata_extractor import extract_metadata
from repository_parser.dependency_parser import build_dependency_graph, find_cycles
from repository_parser.tree_parser import build_file_tree


def scan_project(root: Path) -> dict:
    """
    Runs the full parse pass described in the project's AI Processing
    Flow: walk files -> detect language -> extract entities -> build
    dependency graph. Returns one metadata dict consumed by the
    embedding generator and every agent.
    """
    files_metadata = []
    entities = []
    languages = Counter()
    total_lines = 0

    for path in iter_source_files(root):
        rel_path = path.relative_to(root).as_posix()
        language = detect_language(path)
        source = read_text(path)
        total_lines += source.count("\n") + 1

        meta = extract_metadata(source, rel_path, language)
        files_metadata.append({"path": rel_path, "language": language, "imports": meta["imports"], "source": source})

        for cls in meta["classes"]:
            entities.append({**cls, "type": "class"})
        for fn in meta["functions"]:
            entities.append({**fn, "type": "function"})

        if language:
            languages[language] += 1

    dependency_graph = build_dependency_graph(files_metadata)
    cycles = find_cycles(dependency_graph)

    return {
        "root": str(root),
        "tree": build_file_tree(root),
        "files": files_metadata,
        "entities": entities,
        "dependency_graph": dependency_graph,
        "circular_dependencies": cycles,
        "stats": {
            "file_count": len(files_metadata),
            "total_lines": total_lines,
            "languages": dict(languages),
            "class_count": sum(1 for e in entities if e["type"] == "class"),
            "function_count": sum(1 for e in entities if e["type"] == "function"),
            "dependency_count": sum(len(v) for v in dependency_graph.values()),
        },
    }
