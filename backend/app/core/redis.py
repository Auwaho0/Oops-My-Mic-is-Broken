import logging

import redis.asyncio as aioredis

from app.core.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()

_redis_client: aioredis.Redis | None = None


async def get_redis_client() -> aioredis.Redis | None:
    """
    Returns the singleton async Redis client instance.
    Attempts ping check; if Redis is unreachable, returns None so services can fallback gracefully.
    """
    global _redis_client
    if _redis_client is None:
        try:
            _redis_client = aioredis.from_url(  # type: ignore[no-untyped-call]
                settings.REDIS_URL,
                encoding="utf-8",
                decode_responses=True,
                socket_timeout=2.0,
                socket_connect_timeout=2.0,
            )
            # Test connection
            await _redis_client.ping()
            logger.info("Connected to Redis server successfully at %s", settings.REDIS_URL)
        except Exception as err:
            logger.warning("Redis is unreachable (%s). In-memory fallback will be utilized.", err)
            _redis_client = None

    return _redis_client


async def close_redis_client() -> None:
    """Closes the Redis client connection pool during application shutdown."""
    global _redis_client
    if _redis_client is not None:
        try:
            await _redis_client.close()
            logger.info("Redis connection closed cleanly.")
        except Exception as err:
            logger.error("Error closing Redis connection: %s", err)
        finally:
            _redis_client = None
