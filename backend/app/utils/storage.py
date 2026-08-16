"""
File storage abstraction — supports local filesystem, AWS S3, and Firebase Storage.
"""
import os
import uuid
import logging
from typing import Optional
from app.core.config import settings

logger = logging.getLogger(__name__)


class StorageService:
    """Unified storage interface."""

    def __init__(self):
        self.backend = self._detect_backend()

    def _detect_backend(self) -> str:
        if settings.AWS_ACCESS_KEY_ID and settings.S3_BUCKET_NAME:
            return "s3"
        if settings.FIREBASE_STORAGE_BUCKET:
            return "firebase"
        return "local"

    async def upload_file(
        self,
        file_bytes: bytes,
        filename: str,
        content_type: str = "application/octet-stream",
        folder: str = "uploads",
    ) -> str:
        """Upload file and return public URL."""
        if self.backend == "s3":
            return await self._upload_s3(file_bytes, filename, content_type, folder)
        if self.backend == "firebase":
            return await self._upload_firebase(file_bytes, filename, content_type, folder)
        return await self._upload_local(file_bytes, filename, folder)

    async def _upload_s3(self, file_bytes: bytes, filename: str, content_type: str, folder: str) -> str:
        import boto3
        s3 = boto3.client(
            "s3",
            aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
            aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
            region_name=settings.AWS_REGION,
        )
        key = f"{folder}/{filename}"
        s3.put_object(
            Bucket=settings.S3_BUCKET_NAME,
            Key=key,
            Body=file_bytes,
            ContentType=content_type,
        )
        return f"https://{settings.S3_BUCKET_NAME}.s3.{settings.AWS_REGION}.amazonaws.com/{key}"

    async def _upload_firebase(self, file_bytes: bytes, filename: str, content_type: str, folder: str) -> str:
        import firebase_admin
        from firebase_admin import storage
        import tempfile

        bucket = storage.bucket()
        blob = bucket.blob(f"{folder}/{filename}")

        with tempfile.NamedTemporaryFile(delete=False) as tmp:
            tmp.write(file_bytes)
            tmp_path = tmp.name

        try:
            blob.upload_from_filename(tmp_path, content_type=content_type)
            blob.make_public()
            return blob.public_url
        finally:
            os.unlink(tmp_path)

    async def _upload_local(self, file_bytes: bytes, filename: str, folder: str) -> str:
        """Save to local filesystem (development only)."""
        upload_dir = os.path.join("static", folder)
        os.makedirs(upload_dir, exist_ok=True)
        file_path = os.path.join(upload_dir, filename)
        with open(file_path, "wb") as f:
            f.write(file_bytes)
        return f"/static/{folder}/{filename}"


storage_service = StorageService()
