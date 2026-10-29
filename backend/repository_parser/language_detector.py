from pathlib import Path
from core.constants import SUPPORTED_EXTENSIONS


def detect_language(path: Path) -> str | None:
    return SUPPORTED_EXTENSIONS.get(path.suffix.lower())
