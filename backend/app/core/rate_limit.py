import time
from collections import defaultdict
from collections.abc import Callable
from typing import Optional

from fastapi import Depends, HTTPException, Request, status

from app.api.deps import get_current_user
from app.core.redis import get_redis_client
from app.models.user import User

# In-memory sliding-window fallback for local development or when Redis is offline
_in_memory_cache: dict[str, list[float]] = defaultdict(list)


def get_client_ip(request: Request) -> str:
    """Extracts client IP address respecting X-Forwarded-For proxy headers (§6)."""
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        # First IP in X-Forwarded-For is client origin
        return forwarded.split(",")[0].strip()
    if request.client and request.client.host:
        return request.client.host
    return "127.0.0.1"


async def _enforce_limit(cache_key: str, times: int, seconds: int) -> None:
    """Enforces atomic rate limit via Redis with sliding-window in-memory fallback."""
    redis = await get_redis_client()
    if redis is not None:
        try:
            # Atomic fixed-window counter in Redis
            pipe = redis.pipeline()
            pipe.incr(cache_key)
            pipe.ttl(cache_key)
            results = await pipe.execute()
            current_count = int(results[0])
            ttl = int(results[1])

            if current_count == 1:
                await redis.expire(cache_key, seconds)
                ttl = seconds
            elif ttl == -1:
                await redis.expire(cache_key, seconds)
                ttl = seconds

            if current_count > times:
                retry_after = max(1, ttl if ttl > 0 else seconds)
                raise HTTPException(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    detail=f"Слишком много запросов. Попробуйте снова через {retry_after} сек.",
                    headers={
                        "Retry-After": str(retry_after),
                        "X-RateLimit-Limit": str(times),
                        "X-RateLimit-Remaining": "0",
                    },
                )
            return
        except HTTPException:
            raise
        except Exception:
            # Fallback to in-memory check if Redis fails
            pass

    # In-memory sliding window fallback
    now = time.time()
    window_start = now - seconds
    timestamps = _in_memory_cache[cache_key]

    # Purge expired timestamps
    valid_timestamps = [t for t in timestamps if t > window_start]
    if len(valid_timestamps) >= times:
        earliest = valid_timestamps[0]
        retry_after = max(1, int(seconds - (now - earliest)))
        _in_memory_cache[cache_key] = valid_timestamps
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Слишком много запросов. Попробуйте снова через {retry_after} сек.",
            headers={
                "Retry-After": str(retry_after),
                "X-RateLimit-Limit": str(times),
                "X-RateLimit-Remaining": "0",
            },
        )

    valid_timestamps.append(now)
    _in_memory_cache[cache_key] = valid_timestamps


async def rate_limit_auth(request: Request) -> None:
    """Auth endpoints rate limit: 5 requests per minute per IP (§6)."""
    ip = get_client_ip(request)
    cache_key = f"callsaver:ratelimit:auth:{ip}"
    await _enforce_limit(cache_key, times=5, seconds=60)


async def rate_limit_upload(
    current_user: User = Depends(get_current_user),
) -> None:
    """Sound upload rate limit: 20 uploads per hour per authenticated user (§6)."""
    cache_key = f"callsaver:ratelimit:upload:{current_user.id}"
    await _enforce_limit(cache_key, times=20, seconds=3600)


async def rate_limit_create_excuse(
    current_user: User = Depends(get_current_user),
) -> None:
    """Create custom excuse rate limit: 60 excuses per hour per authenticated user (§6)."""
    cache_key = f"callsaver:ratelimit:create_excuse:{current_user.id}"
    await _enforce_limit(cache_key, times=60, seconds=3600)
