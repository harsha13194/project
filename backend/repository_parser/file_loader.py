from pathlib import Path
from core.constants import IGNORED_DIRS, MAX_FILE_SIZE_BYTES


def iter_source_files(root: Path):
    """Yields every file under `root` that isn't in an ignored dir or oversized."""
    for path in root.rglob("*"):
        if not path.is_file():
            continue
        # Check only the path components *inside* the repo (relative to root).
        # Using the full/absolute path here would also match ancestor folders
        # like this project's own "temp" workspace directory (WORKSPACE_ROOT),
        # which is itself in IGNORED_DIRS — that previously caused every file
        # in every cloned/extracted repo to be silently discarded.
        if any(part in IGNORED_DIRS for part in path.relative_to(root).parts):
            continue
        try:
            if path.stat().st_size > MAX_FILE_SIZE_BYTES:
                continue
        except OSError:
            continue
        yield path


def read_text(path: Path) -> str:
    try:
        return path.read_text(encoding="utf-8", errors="ignore")
    except OSError:
        return ""
