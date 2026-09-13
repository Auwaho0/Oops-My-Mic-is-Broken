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
from collections.abc import Callable
from typing import Optional

from fastapi import Depends, HTTPException, Request, status

from app.api.deps import get_current_user
from app.core.redis import get_redis_client
from app.models.user import User

# Резервный in-memory кэш скользящего окна (используется при недоступности Redis или в локальных тестах)
# Хранит список таймстемпов последних запросов: { "ключ_клиента": [timestamp1, timestamp2, ...] }
_in_memory_cache: dict[str, list[float]] = defaultdict(list)


def get_client_ip(request: Request) -> str:
    """
    Извлечение реального IP-адреса клиента.
    Учитывает заголовок `X-Forwarded-For`, который устанавливает обратный прокси (Nginx).
    Первый IP в списке — это настоящий адрес клиента, остальные — промежуточные прокси.
    """
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        return forwarded.split(",")[0].strip()
    if request.client and request.client.host:
        return request.client.host
    return "127.0.0.1"


async def _enforce_limit(cache_key: str, times: int, seconds: int) -> None:
    """
    Основная функция проверки и фиксации лимита:
    - `cache_key`: уникальный ключ (например, IP или ID пользователя)
    - `times`: максимальное разрешенное количество запросов
    - `seconds`: временное окно (в секундах)
    """
    redis = await get_redis_client()
    if redis is not None:
        try:
            # Атомарный пайплайн в Redis
            pipe = redis.pipeline()
            pipe.incr(cache_key)  # Увеличиваем счетчик обращений на 1
            pipe.ttl(cache_key)   # Узнаем оставшееся время жизни ключа
            results = await pipe.execute()
            
            current_count = int(results[0])
            ttl = int(results[1])

            # Если это первый запрос в окне — выставляем время жизни ключа
            if current_count == 1:
                await redis.expire(cache_key, seconds)
                ttl = seconds
            elif ttl == -1:
                # Защита от бесконечного ключа в случае сбоя
                await redis.expire(cache_key, seconds)
                ttl = seconds

            # Если лимит превышен — выбрасываем HTTP 429 Too Many Requests
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
            # Пробрасываем 429 ошибку наверх
            raise
        except Exception:
            # При сбое соединения с Redis мягко переключаемся на проверку в памяти
            pass

    # --------------------------------------------------------------------------
    # Fallback: алгоритм скользящего окна в оперативной памяти процесса
    # --------------------------------------------------------------------------
    now = time.time()
    window_start = now - seconds
    timestamps = _in_memory_cache[cache_key]

    # Очищаем таймстемпы, которые вышли за пределы текущего временного окна
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

    # Добавляем текущий запрос в историю
    valid_timestamps.append(now)
    _in_memory_cache[cache_key] = valid_timestamps


# --------------------------------------------------------------------------
# FastAPI зависимости (Dependencies) для использования в роутерах
# --------------------------------------------------------------------------

async def rate_limit_auth(request: Request) -> None:
    """
    Защита роутов аутентификации:
    Максимум 5 попыток в минуту с одного IP-адреса.
    """
    ip = get_client_ip(request)
    cache_key = f"callsaver:ratelimit:auth:{ip}"
    await _enforce_limit(cache_key, times=5, seconds=60)


async def rate_limit_upload(
    current_user: User = Depends(get_current_user),
) -> None:
    """
    Защита загрузки звуков:
    Максимум 20 файлов в час на одного авторизованного пользователя.
    """
    cache_key = f"callsaver:ratelimit:upload:{current_user.id}"
    await _enforce_limit(cache_key, times=20, seconds=3600)


async def rate_limit_create_excuse(
    current_user: User = Depends(get_current_user),
) -> None:
    """
    Защита создания кастомных отговорок:
    Максимум 60 отговорок в час на одного пользователя.
    """
    cache_key = f"callsaver:ratelimit:create_excuse:{current_user.id}"
    await _enforce_limit(cache_key, times=60, seconds=3600)
