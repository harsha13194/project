import os
import stat
import shutil
import zipfile
from pathlib import Path
from fastapi import UploadFile
from core.config import settings
from core.logger import get_logger

logger = get_logger(__name__)


def remove_readonly(func, path, exc_info):
    os.chmod(path, stat.S_IWRITE)
    func(path)


async def upload_project(zip_file: UploadFile) -> Path:
    """
    Accepts a zipped project folder from the frontend's "Upload folder"
    action, extracts it, and replaces whatever repository was loaded
    before — same single-active-repository rule as clone_repository.
    """
    target = settings.repositories_dir / "current"
    if target.exists():
        shutil.rmtree(target, onerror=remove_readonly)
    target.mkdir(parents=True)

    tmp_zip = settings.repositories_dir / "_upload.zip"
    with open(tmp_zip, "wb") as f:
        f.write(await zip_file.read())

    try:
        with zipfile.ZipFile(tmp_zip, "r") as zf:
            zf.extractall(target)
    except zipfile.BadZipFile:
        raise ValueError("Uploaded file is not a valid .zip archive")
    finally:
        tmp_zip.unlink(missing_ok=True)

    # If the zip extracted into a single wrapper folder (e.g. target/Project/), return that subfolder directly
    items = [p for p in target.iterdir() if p.is_dir() and not p.name.startswith(".")]
    all_items = [p for p in target.iterdir() if not p.name.startswith(".")]
    if len(all_items) == 1 and len(items) == 1:
        logger.info(f"Unwrapping single top-level folder {items[0].name}")
        return items[0]

    logger.info(f"Uploaded project extracted -> {target}")
    return target


