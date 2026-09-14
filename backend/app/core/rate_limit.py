"""
==============================================================================
backend/app/core/rate_limit.py — Механизм ограничения частоты запросов (Rate Limiting)
==============================================================================

Учебный путеводитель по защите API (Rate Limiting) для новичков в Python:

1. Зачем нужен Rate Limiting?
   - Защита от брутфорса паролей (перебора по словарю на эндпоинтах логина).
   - Защита от DoS/DDoS атак и исчерпания дискового пространства в S3 при загрузке аудио.
   - Защита от спама и парсинга контента.

2. Как работает связка с Redis:
   - Мы используем Redis `pipeline`: это пакет команд, который отправляется на сервер Redis
     за один сетевой round-trip (`INCR` увеличивает счетчик, `TTL` возвращает оставшееся время).
   - Это гарантирует атомарность (race conditions исключены даже при сотнях параллельных запросов).

3. Отказоустойчивость (Graceful Degradation):
   - Если сервер Redis временно упал или не запущен локально, мы не роняем все приложение!
     Блок `try...except` перехватывает ошибку и переключается на встроенный в память
     алгоритм со скользящим окном (`_in_memory_cache`).

4. Инъекция зависимостей FastAPI (`Depends`):
   - Функции `rate_limit_auth`, `rate_limit_upload` и `rate_limit_create_excuse`
     подключаются прямо в заголовке роутера:
     `@router.post("/login", dependencies=[Depends(rate_limit_auth)])`
   - Если лимит превышен, функция бросает `HTTPException(429)` еще ДО того,
     как начнет выполняться тяжелая бизнес-логика роутера или запросы к БД!
"""

import time
from collections import defaultdict
from typing import Annotated

from fastapi import Depends, HTTPException, Request, status

from app.api.deps import get_current_user
from app.core.redis import get_redis_client
from app.models.user import User

# Fallback in-memory sliding window cache (used when Redis is unavailable or in local test suites)
# Stores lists of request timestamps per client: { "client_key": [timestamp1, timestamp2, ...] }
_in_memory_cache: dict[str, list[float]] = defaultdict(list)


def get_client_ip(request: Request) -> str:
    """
    Extract client real IP address.
    Checks `X-Forwarded-For` header populated by reverse proxies (Nginx).
    The first IP in the list represents the client origin; subsequent IPs represent intermediate proxies.
    """
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        return forwarded.split(",")[0].strip()
    if request.client and request.client.host:
        return request.client.host
    return "127.0.0.1"


async def _enforce_limit(cache_key: str, times: int, seconds: int) -> None:
    """
    Core rate limit validation and tracking function:
    - `cache_key`: unique identifier key (e.g. IP or user ID)
    - `times`: maximum permitted requests
    - `seconds`: sliding time window duration in seconds
    """
    redis = await get_redis_client()
    if redis is not None:
        try:
            # Atomic Redis pipeline
            pipe = redis.pipeline()
            pipe.incr(cache_key)  # Increment access counter by 1
            pipe.ttl(cache_key)   # Query remaining time-to-live
            results = await pipe.execute()

            current_count = int(results[0])
            ttl = int(results[1])

            # If this is the initial hit in window, set TTL
            if current_count == 1:
                await redis.expire(cache_key, seconds)
                ttl = seconds
            elif ttl == -1:
                # Guard against infinite key lifetime in case of prior failover
                await redis.expire(cache_key, seconds)
                ttl = seconds

            # If threshold exceeded, raise HTTP 429 Too Many Requests
            if current_count > times:
                retry_after = max(1, ttl if ttl > 0 else seconds)
                raise HTTPException(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    detail=f"Rate limit exceeded. Try again in {retry_after} seconds.",
                    headers={
                        "Retry-After": str(retry_after),
                        "X-RateLimit-Limit": str(times),
                        "X-RateLimit-Remaining": "0",
                    },
                )
            return
        except HTTPException:
            # Re-raise rate limit 429 error
            raise
        except Exception:
            # On Redis connection failure, fall back to process in-memory sliding window
            pass

    # --------------------------------------------------------------------------
    # Fallback: In-memory sliding window algorithm
    # --------------------------------------------------------------------------
    now = time.time()
    window_start = now - seconds
    timestamps = _in_memory_cache[cache_key]

    # Clean expired timestamps outside active window
    valid_timestamps = [t for t in timestamps if t > window_start]

    if len(valid_timestamps) >= times:
        earliest = valid_timestamps[0]
        retry_after = max(1, int(seconds - (now - earliest)))
        _in_memory_cache[cache_key] = valid_timestamps
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Rate limit exceeded. Try again in {retry_after} seconds.",
            headers={
                "Retry-After": str(retry_after),
                "X-RateLimit-Limit": str(times),
                "X-RateLimit-Remaining": "0",
            },
        )

    # Record current timestamp in history
    valid_timestamps.append(now)
    _in_memory_cache[cache_key] = valid_timestamps


# --------------------------------------------------------------------------
# FastAPI Router Dependencies
# --------------------------------------------------------------------------

async def rate_limit_auth(request: Request) -> None:
    """
    Rate limit protection for auth routes:
    Max 5 attempts per minute per IP address.
    """
    ip = get_client_ip(request)
    cache_key = f"callsaver:ratelimit:auth:{ip}"
    await _enforce_limit(cache_key, times=5, seconds=60)


async def rate_limit_upload(
    current_user: Annotated[User, Depends(get_current_user)],
) -> None:
    """
    Rate limit protection for audio file uploads:
    Max 20 uploads per hour per authenticated user.
    """
    cache_key = f"callsaver:ratelimit:upload:{current_user.id}"
    await _enforce_limit(cache_key, times=20, seconds=3600)


async def rate_limit_create_excuse(
    current_user: Annotated[User, Depends(get_current_user)],
) -> None:
    """
    Rate limit protection for custom excuse generation:
    Max 60 excuses per hour per authenticated user.
    """
    cache_key = f"callsaver:ratelimit:create_excuse:{current_user.id}"
    await _enforce_limit(cache_key, times=60, seconds=3600)
