import os
import stat
import shutil
from pathlib import Path
from git import Repo, GitCommandError
from core.config import settings
from core.logger import get_logger

logger = get_logger(__name__)


def remove_readonly(func, path, exc_info):
    os.chmod(path, stat.S_IWRITE)
    func(path)


def clone_repository(git_url: str) -> Path:
    """
    Clones `git_url` into a fresh folder under temp/repositories/current.
    Only one repository is kept at a time — loading a new one replaces
    the previous checkout, matching the "no permanent storage" rule.
    """
    target = settings.repositories_dir / "current"
    if target.exists():
        shutil.rmtree(target, onerror=remove_readonly)

    try:
        Repo.clone_from(git_url, target, depth=1)
    except GitCommandError as e:
        logger.error(f"Clone failed for {git_url}: {e}")
        raise ValueError(f"Could not clone repository: {e}")

    logger.info(f"Cloned {git_url} -> {target}")
    return target

