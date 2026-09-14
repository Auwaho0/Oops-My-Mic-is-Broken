import logging
import os
import uuid

import boto3
from botocore.config import Config

from app.core.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()


class StorageService:
    def __init__(self) -> None:
        self.bucket = settings.S3_BUCKET_NAME
        self.endpoint_url = settings.S3_ENDPOINT_URL
        self.s3_client = boto3.client(
            "s3",
            endpoint_url=self.endpoint_url,
            aws_access_key_id=settings.S3_ACCESS_KEY,
            aws_secret_access_key=settings.S3_SECRET_KEY,
            config=Config(signature_version="s3v4"),
            region_name="us-east-1",
        )
        self._ensure_bucket()

    def _ensure_bucket(self) -> None:
        try:
            self.s3_client.head_bucket(Bucket=self.bucket)
        except Exception:
            try:
                self.s3_client.create_bucket(Bucket=self.bucket)
            except Exception as e:
                logger.warning(
                    f"Could not connect to S3 or initialize bucket '{self.bucket}': {e}. "
                    "Falling back to local disk storage."
                )

    async def upload_file(
        self,
        content: bytes,
        mime_type: str,
        user_id: uuid.UUID,
        file_extension: str,
    ) -> tuple[str, str]:
        """
        Uploads an audio file and returns (file_key, file_url).
        """
        file_id = uuid.uuid4()
        clean_ext = file_extension.lstrip(".").lower()
        file_key = f"sounds/{user_id}/{file_id}.{clean_ext}"

        try:
            self.s3_client.put_object(
                Bucket=self.bucket,
                Key=file_key,
                Body=content,
                ContentType=mime_type,
            )
            # Generate a presigned URL or direct link
            file_url = self.generate_presigned_url(file_key)
            return file_key, file_url
        except Exception as e:
            logger.warning(f"S3 put_object failed ({e}), falling back to local file serving")
            # Local fallback for environments without live MinIO
            local_dir = os.path.join(os.getcwd(), "uploads", "sounds", str(user_id))
            os.makedirs(local_dir, exist_ok=True)
            local_path = os.path.join(local_dir, f"{file_id}.{clean_ext}")
            with open(local_path, "wb") as f:
                f.write(content)
            fallback_url = f"/api/v1/sounds/files/{user_id}/{file_id}.{clean_ext}"
            return file_key, fallback_url

    def generate_presigned_url(self, file_key: str, expires_in: int = 3600 * 24) -> str:
        try:
            return str(
                self.s3_client.generate_presigned_url(
                    "get_object",
                    Params={"Bucket": self.bucket, "Key": file_key},
                    ExpiresIn=expires_in,
                )
            )
        except Exception:
            return f"/api/v1/sounds/files/{file_key}"
