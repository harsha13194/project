from pathlib import Path
from core.constants import IGNORED_DIRS


def build_file_tree(root: Path) -> dict:
    """
    Returns a nested {"name", "type": "folder"|"file", "children": [...]}
    tree — this is the exact shape the frontend's FileNode component
    expects, so the API response can be passed straight into fileTree.
    """
    return _walk(root, root)


def _walk(path: Path, root: Path) -> dict:
    if path.is_dir():
        children = sorted(
            [p for p in path.iterdir() if p.name not in IGNORED_DIRS and not p.name.startswith(".")],
            key=lambda p: (p.is_file(), p.name.lower()),
        )
        return {
            "name": path.name or str(path),
            "type": "folder",
            "children": [_walk(c, root) for c in children],
        }
    return {"name": path.name, "type": "file", "path": path.relative_to(root).as_posix()}
