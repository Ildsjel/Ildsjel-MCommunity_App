"""
Image Upload and Processing Service

Storage strategy:
  - R2 configured (production): images are uploaded directly to Cloudflare R2
    and URLs are returned as fully-qualified https://... paths.
  - R2 not configured (local dev): images are saved to UPLOADS_DIR on disk
    and URLs are returned as relative /uploads/... paths served by FastAPI's
    StaticFiles mount.
"""
import io
import uuid
from pathlib import Path
from typing import Tuple, Optional

from PIL import Image
from fastapi import UploadFile, HTTPException


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _to_rgb(image: Image.Image) -> Image.Image:
    if image.mode in ('RGBA', 'LA', 'P'):
        bg = Image.new('RGB', image.size, (255, 255, 255))
        if image.mode == 'P':
            image = image.convert('RGBA')
        mask = image.split()[-1] if image.mode in ('RGBA', 'LA') else None
        bg.paste(image, mask=mask)
        return bg
    if image.mode != 'RGB':
        return image.convert('RGB')
    return image


def _resize_and_crop(image: Image.Image, size: Tuple[int, int]) -> Image.Image:
    """Centre-crop then resize to exact (w, h)."""
    img_ratio = image.width / image.height
    target_ratio = size[0] / size[1]
    if img_ratio > target_ratio:
        new_w = int(image.height * target_ratio)
        left = (image.width - new_w) // 2
        image = image.crop((left, 0, left + new_w, image.height))
    else:
        new_h = int(image.width / target_ratio)
        top = (image.height - new_h) // 2
        image = image.crop((0, top, image.width, top + new_h))
    return image.resize(size, Image.Resampling.LANCZOS)


def _resize_keep_aspect(image: Image.Image, max_size: Tuple[int, int]) -> Image.Image:
    image.thumbnail(max_size, Image.Resampling.LANCZOS)
    return image


# ---------------------------------------------------------------------------
# Service
# ---------------------------------------------------------------------------

class ImageService:
    ALLOWED_EXTENSIONS = {'.jpg', '.jpeg', '.png', '.gif', '.webp'}
    ALLOWED_MIME_TYPES = {'image/jpeg', 'image/png', 'image/gif', 'image/webp'}
    MAX_FILE_SIZE = 10 * 1024 * 1024  # 10 MB

    AVATAR_SIZE     = (400, 400)
    GALLERY_SIZE    = (1200, 1200)
    THUMBNAIL_SIZE  = (300, 300)
    BAND_PHOTO_SIZE = (1200, 675)
    BAND_LOGO_SIZE  = (400, 400)

    def __init__(self, upload_dir: str = None):
        from app.config.settings import settings

        # ── Local disk (dev fallback) ──────────────────────────────────────
        ud = Path(upload_dir or settings.UPLOADS_DIR)
        self.upload_dir    = ud
        self.avatar_dir    = ud / "avatars"
        self.gallery_dir   = ud / "gallery"
        self.thumbnail_dir = ud / "thumbnails"
        self.band_photo_dir = ud / "bands" / "photos"
        self.band_logo_dir  = ud / "bands" / "logos"
        for d in (self.avatar_dir, self.gallery_dir, self.thumbnail_dir,
                  self.band_photo_dir, self.band_logo_dir):
            d.mkdir(parents=True, exist_ok=True)

        # ── Cloudflare R2 ──────────────────────────────────────────────────
        self.r2_enabled = bool(
            settings.R2_ACCOUNT_ID and settings.R2_ACCESS_KEY_ID
            and settings.R2_SECRET_ACCESS_KEY and settings.R2_BUCKET_NAME
        )
        if self.r2_enabled:
            import boto3
            from botocore.config import Config
            self._s3 = boto3.client(
                "s3",
                endpoint_url=f"https://{settings.R2_ACCOUNT_ID}.r2.cloudflarestorage.com",
                aws_access_key_id=settings.R2_ACCESS_KEY_ID,
                aws_secret_access_key=settings.R2_SECRET_ACCESS_KEY,
                config=Config(signature_version="s3v4"),
                region_name="auto",
            )
            self._bucket     = settings.R2_BUCKET_NAME
            self._public_url = settings.R2_PUBLIC_URL.rstrip("/")
        else:
            self._s3 = None

    # ── Internal helpers ──────────────────────────────────────────────────

    def _save(self, image: Image.Image, key: str, quality: int = 85) -> str:
        """
        Save a PIL image. If R2 is enabled, upload to R2 and return the public URL.
        Otherwise write to local disk and return the /uploads/... path.
        key examples: 'avatars/abc_avatar_12345678.jpg'
                      'bands/photos/xyz_photo_abcd.jpg'
        """
        ext = Path(key).suffix.lower()
        fmt = "JPEG" if ext in (".jpg", ".jpeg") else "PNG"
        content_type = "image/jpeg" if fmt == "JPEG" else "image/png"

        if self.r2_enabled:
            buf = io.BytesIO()
            image.save(buf, format=fmt, quality=quality, optimize=True)
            buf.seek(0)
            self._s3.upload_fileobj(
                buf, self._bucket, key,
                ExtraArgs={"ContentType": content_type, "CacheControl": "public, max-age=31536000"},
            )
            return f"{self._public_url}/{key}"
        else:
            path = self.upload_dir / key
            path.parent.mkdir(parents=True, exist_ok=True)
            image.save(path, quality=quality, optimize=True)
            return f"/uploads/{key}"

    def _save_raw(self, data: bytes, key: str, content_type: str) -> str:
        """Upload raw bytes (used by the migration script)."""
        if self.r2_enabled:
            self._s3.upload_fileobj(
                io.BytesIO(data), self._bucket, key,
                ExtraArgs={"ContentType": content_type, "CacheControl": "public, max-age=31536000"},
            )
            return f"{self._public_url}/{key}"
        else:
            path = self.upload_dir / key
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_bytes(data)
            return f"/uploads/{key}"

    def validate_image(self, file: UploadFile) -> None:
        ext = Path(file.filename or "").suffix.lower()
        if ext not in self.ALLOWED_EXTENSIONS:
            raise HTTPException(400, f"Invalid file type. Allowed: {', '.join(self.ALLOWED_EXTENSIONS)}")
        if file.content_type not in self.ALLOWED_MIME_TYPES:
            raise HTTPException(400, f"Invalid content type: {file.content_type}")

    async def _read_and_open(self, file: UploadFile) -> Tuple[bytes, Image.Image]:
        content = await file.read()
        if len(content) > self.MAX_FILE_SIZE:
            raise HTTPException(400, f"File too large. Max: {self.MAX_FILE_SIZE // 1024 // 1024} MB")
        try:
            return content, Image.open(io.BytesIO(content))
        except Exception as e:
            raise HTTPException(400, f"Failed to open image: {e}")

    # ── Public API ─────────────────────────────────────────────────────────

    async def process_avatar(self, file: UploadFile, user_id: str) -> Tuple[str, str]:
        """Returns (image_url, key)."""
        self.validate_image(file)
        _, image = await self._read_and_open(file)
        image = _to_rgb(image)
        image = _resize_and_crop(image, self.AVATAR_SIZE)
        ext = Path(file.filename or "image.jpg").suffix.lower()
        key = f"avatars/{user_id}_avatar_{uuid.uuid4().hex[:8]}{ext}"
        url = self._save(image, key, quality=85)
        return url, key

    async def process_gallery_image(self, file: UploadFile, user_id: str) -> Tuple[str, str, str]:
        """Returns (image_url, thumbnail_url, key)."""
        self.validate_image(file)
        _, image = await self._read_and_open(file)
        image = _to_rgb(image)
        ext = Path(file.filename or "image.jpg").suffix.lower()
        base = f"{user_id}_gallery_{uuid.uuid4().hex[:12]}"

        main_key  = f"gallery/{base}{ext}"
        thumb_key = f"thumbnails/{base}_thumb{ext}"

        main_url  = self._save(_resize_keep_aspect(image.copy(), self.GALLERY_SIZE),  main_key,  quality=90)
        thumb_url = self._save(_resize_and_crop(image.copy(),    self.THUMBNAIL_SIZE), thumb_key, quality=80)
        return main_url, thumb_url, main_key

    async def process_band_photo(self, file: UploadFile, band_id: str) -> Tuple[str, str]:
        """Returns (image_url, key)."""
        self.validate_image(file)
        _, image = await self._read_and_open(file)
        image = _to_rgb(image)
        image = _resize_and_crop(image, self.BAND_PHOTO_SIZE)
        ext = Path(file.filename or "image.jpg").suffix.lower()
        key = f"bands/photos/{band_id}_photo_{uuid.uuid4().hex[:8]}{ext}"
        url = self._save(image, key, quality=88)
        return url, key

    async def process_band_logo(self, file: UploadFile, band_id: str) -> Tuple[str, str]:
        """Returns (image_url, key)."""
        self.validate_image(file)
        _, image = await self._read_and_open(file)
        image = _to_rgb(image)
        image = _resize_and_crop(image, self.BAND_LOGO_SIZE)
        ext = Path(file.filename or "image.jpg").suffix.lower()
        key = f"bands/logos/{band_id}_logo_{uuid.uuid4().hex[:8]}{ext}"
        url = self._save(image, key, quality=88)
        return url, key

    def delete_image(self, file_path: str) -> bool:
        """Delete from local disk (R2 objects are not deleted for now)."""
        if self.r2_enabled:
            return True  # no-op; old R2 objects can expire via lifecycle rule
        try:
            p = Path(file_path)
            if p.exists():
                p.unlink()
                return True
        except Exception as e:
            print(f"Failed to delete image {file_path}: {e}")
        return False


# Global singleton
image_service = ImageService()
