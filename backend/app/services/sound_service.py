import logging
import uuid
from collections.abc import Sequence

from fastapi import HTTPException, UploadFile, status

from app.models.sound import Sound, SoundCategory
from app.repositories.sound_repository import SoundRepository
from app.services.storage_service import StorageService

logger = logging.getLogger(__name__)

# Max 5 MB (§8)
MAX_FILE_SIZE = 5 * 1024 * 1024
# Max 30 seconds (§8)
MAX_DURATION_SEC = 30.0

ALLOWED_EXTENSIONS = {".mp3", ".wav", ".ogg", ".m4a"}
ALLOWED_MIME_TYPES = {
    "audio/mpeg",
    "audio/mp3",
    "audio/wav",
    "audio/x-wav",
    "audio/ogg",
    "audio/x-m4a",
    "audio/mp4",
    "audio/aac",
}

# Basic profanity filter for UGC moderation (§8)
PROFANITY_BLOCKLIST = [
    "хуй",
    "пизд",
    "ебат",
    "бляд",
    "fuck",
    "shit",
    "bitch",
]


class SoundService:
    def __init__(
        self,
        repository: SoundRepository,
        storage_service: StorageService | None = None,
    ) -> None:
        self.repository = repository
        self.storage = storage_service or StorageService()

    def _validate_profanity(self, text: str) -> bool:
        lowered = text.lower()
        return any(bad_word in lowered for bad_word in PROFANITY_BLOCKLIST)

    def _detect_magic_bytes(self, header: bytes) -> bool:
        # ID3 / MP3: 49 44 33 or FF FB / FF F3
        if header.startswith(b"ID3") or (len(header) >= 2 and header[0] == 0xFF and (header[1] & 0xE0) == 0xE0):
            return True
        # RIFF / WAV: 52 49 46 46
        if header.startswith(b"RIFF"):
            return True
        # OggS: 4F 67 67 53
        if header.startswith(b"OggS"):
            return True
        # M4A / MP4 ftyp: [any 4] 66 74 79 70 (ftyp)
        if len(header) >= 8 and header[4:8] == b"ftyp":
            return True
        return False

    async def get_sounds(
        self,
        category: SoundCategory | None = None,
        user_id: uuid.UUID | None = None,
        include_all_user_sounds: bool = False,
        offset: int = 0,
        limit: int = 50,
    ) -> tuple[Sequence[Sound], int]:
        return await self.repository.get_all(
            category=category,
            user_id=user_id,
            include_all_user_sounds=include_all_user_sounds,
            offset=offset,
            limit=limit,
        )

    async def upload_sound(
        self,
        file: UploadFile,
        title: str,
        category: SoundCategory,
        user_id: uuid.UUID,
        estimated_duration: float = 10.0,
    ) -> Sound:
        # 1. Moderation: title validation (§8)
        if self._validate_profanity(title):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Title contains prohibited or offensive vocabulary.",
            )

        # 2. Filename and extension check
        filename = file.filename or "sound.mp3"
        ext = "." + filename.split(".")[-1].lower() if "." in filename else ""
        if ext not in ALLOWED_EXTENSIONS:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Unsupported file format '{ext}'. Allowed: mp3, wav, ogg, m4a.",
            )

        # 3. Read content and check size (max 5 MB)
        content = await file.read()
        file_size = len(content)
        if file_size > MAX_FILE_SIZE:
            raise HTTPException(
                status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                detail=f"File exceeds maximum allowed size of 5 MB (received {file_size / (1024*1024):.2f} MB).",
            )
        if file_size < 16:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="File is empty or corrupted.",
            )

        # 4. Header validation (magic bytes) (§8)
        header = content[:16]
        if not self._detect_magic_bytes(header):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="File header does not match valid audio format (mp3/wav/ogg/m4a).",
            )

        # 5. Duration limit (max 30s) (§8)
        duration_sec = min(float(estimated_duration), MAX_DURATION_SEC)
        if duration_sec <= 0:
            duration_sec = 10.0

        mime_type = file.content_type or "audio/mpeg"

        # 6. Upload to S3 / MinIO
        file_key, file_url = await self.storage.upload_file(
            content=content,
            mime_type=mime_type,
            user_id=user_id,
            file_extension=ext,
        )

        sound = Sound(
            title=title.strip(),
            category=category.value,
            file_key=file_key,
            file_url=file_url,
            mime_type=mime_type,
            file_size=file_size,
            duration_sec=duration_sec,
            is_nsfw=False,
            is_system=False,
            user_id=user_id,
        )
        return await self.repository.create(sound)

    async def delete_sound(
        self,
        sound_id: uuid.UUID,
        user_id: uuid.UUID,
        user_role: str = "user",
    ) -> Sound:
        sound = await self.repository.get_by_id(sound_id)
        if not sound:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Sound not found.",
            )

        # Only owner or admin/moderator can delete (§8)
        if sound.user_id != user_id and user_role not in ("admin", "moderator"):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have permission to delete this sound.",
            )

        return await self.repository.soft_delete(sound)
