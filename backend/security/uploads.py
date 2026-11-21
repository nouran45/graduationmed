"""
Safe upload handling.

Old behaviour (app.py / prescriptions.py):  `content = await file.read()`
  - reads the WHOLE body into memory, however large  -> memory exhaustion
  - trusts the filename extension / client Content-Type -> a renamed .exe or
    HTML file is accepted as "image/png"
  - passes any bytes to the ML pipeline

New behaviour:
  1. read in 64 KiB chunks and stop as soon as the byte budget is exceeded
  2. identify the real type from the file's magic bytes
  3. for images, let Pillow parse the header and reject absurd dimensions
     (decompression bombs) before any model sees the data
  4. the stored extension is derived from the sniffed type, never the filename
"""
from __future__ import annotations

import io
import os
import re
from typing import Optional

from fastapi import HTTPException, UploadFile, status
from PIL import Image, UnidentifiedImageError

from .config import get_settings
from .request_context import add_detail

_CHUNK = 64 * 1024

JPEG_MAGIC = b"\xff\xd8\xff"
PNG_MAGIC = b"\x89PNG\r\n\x1a\n"
PDF_MAGIC = b"%PDF-"


def _size_bucket(n: int) -> str:
    """Coarse size class (exact byte counts are not needed by detectors)."""
    if n < 100 * 1024:
        return "small"
    if n < 1024 * 1024:
        return "medium"
    if n < 5 * 1024 * 1024:
        return "large"
    return "xlarge"


async def read_upload_limited(file: UploadFile, max_bytes: int) -> bytes:
    buf = bytearray()
    while True:
        chunk = await file.read(_CHUNK)
        if not chunk:
            break
        buf.extend(chunk)
        if len(buf) > max_bytes:
            add_detail("size_bucket", "over_limit")
            raise HTTPException(
                status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                f"File too large. Maximum size is {max_bytes // (1024 * 1024)} MB.",
            )
    if not buf:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "The uploaded file is empty.")
    add_detail("size_bucket", _size_bucket(len(buf)))
    return bytes(buf)


def sniff_type(data: bytes) -> Optional[str]:
    """Return 'jpeg' | 'png' | 'pdf' | None based on magic bytes only."""
    if data.startswith(JPEG_MAGIC):
        return "jpeg"
    if data.startswith(PNG_MAGIC):
        return "png"
    if data.startswith(PDF_MAGIC):
        return "pdf"
    return None


EXTENSION = {"jpeg": ".jpg", "png": ".png", "pdf": ".pdf"}
CONTENT_TYPE = {"jpeg": "image/jpeg", "png": "image/png", "pdf": "application/pdf"}


def validate_image_bytes(data: bytes) -> str:
    """Return the sniffed kind ('jpeg'|'png') or raise a 4xx."""
    kind = sniff_type(data)
    add_detail("file_kind", kind or "unknown")
    if kind not in ("jpeg", "png"):
        raise HTTPException(
            status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            "Invalid file format. Supported: .jpg, .jpeg, .png",
        )
    try:
        with Image.open(io.BytesIO(data)) as img:        # lazy: reads header only
            width, height = img.size
            if width * height > get_settings().max_image_pixels:
                raise HTTPException(
                    status.HTTP_400_BAD_REQUEST, "Image dimensions are too large."
                )
            img.verify()                                  # structural integrity
    except HTTPException:
        raise
    except (UnidentifiedImageError, OSError, SyntaxError, Image.DecompressionBombError):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "The image file is corrupt or unsupported.")
    return kind


def safe_display_filename(name: Optional[str], default: str = "upload") -> str:
    """Filename suitable for storing as *metadata only* (never as a path)."""
    base = os.path.basename((name or "").replace("\\", "/")).strip()
    base = re.sub(r"[^A-Za-z0-9._ -]", "_", base)[:120]
    return base or default
