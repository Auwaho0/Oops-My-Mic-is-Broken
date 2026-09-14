"""
==============================================================================
backend/app/main.py — Главная точка входа приложения FastAPI
==============================================================================

Учебный путеводитель по FastAPI для начинающих (Архитектурные концепции):

1. `FastAPI` — современный, высокопроизводительный асинхронный фреймворк для Python,
   построенный на базе Starlette (веб) и Pydantic (валидация данных).
2. `lifespan` — асинхронный контекстный менеджер жизненного цикла приложения.
   Код ДО `yield` выполняется при старте (подключение к БД, сидирование данных).
   Код ПОСЛЕ `yield` выполняется при остановке (закрытие пула Redis, сброс кэшей).
3. Middleware (Промежуточное ПО):
   - CORS: разрешает фронтенду на другом порту/домене делать запросы к API с передачей cookies.
   - Request Logging: перехватывает КАЖДЫЙ HTTP-запрос, генерирует уникальный `X-Request-ID`,
     замеряет время ответа в миллисекундах и логирует результат в формате JSON.
4. `ContextVar` (`request_id_ctx`):
   - Потокобезопасная / таскобезопасная переменная контекста в Python `asyncio`.
   - Позволяет любой функции в глубине сервисов узнать текущий `request_id` без
     необходимости передавать его аргументом через 10 слоев кода.
5. RFC 7807 (Problem Details):
   - Обработчики исключений `http_exception_handler` и `validation_exception_handler`
     перехватывают любые ошибки (401, 403, 404, 422, 429, 500) и оборачивают их в
     единый промышленный стандарт ответа `application/problem+json`.
"""

import logging
import time
import uuid
from collections.abc import AsyncGenerator, Awaitable, Callable
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, Request, Response, status
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.api.v1.api import api_router
from app.core.config import get_settings
from app.core.database import AsyncSessionLocal
from app.core.logging import request_id_ctx, setup_logging
from app.core.rate_limit import get_client_ip
from app.core.redis import close_redis_client
from app.core.seeds import seed_system_excuses
from app.schemas.errors import ProblemDetail
from app.schemas.health import HealthResponse, ReadyResponse

# Load application configuration from environment variables (.env)
settings = get_settings()

# Initialize structured JSON logging
setup_logging(settings.APP_ENV)
logger = logging.getLogger("callsaver.app")


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """
    Manage application lifecycle (Startup & Shutdown).
    """
    logger.info("Application starting up in %s mode", settings.APP_ENV)

    # 1. On startup: check database connection and seed default system excuses
    try:
        async with AsyncSessionLocal() as session:
            await seed_system_excuses(session)
        logger.info("System excuses seeded successfully.")
    except Exception as exc:
        logger.warning("Could not seed system excuses on startup: %s", exc)

    yield  # Application is active and processing client requests

    # 2. On shutdown: cleanly close connections to Redis
    logger.info("Application shutting down...")
    await close_redis_client()


# Create FastAPI application instance
app = FastAPI(
    title=settings.APP_NAME,
    description="Playful but production-grade PWA for escaping online calls.",
    version="0.1.0",
    lifespan=lifespan,
    docs_url="/docs",            # Interactive Swagger UI documentation
    redoc_url="/redoc",          # Alternative ReDoc documentation
    openapi_url="/openapi.json", # OpenAPI schema specification
)

# Configure CORS (Cross-Origin Resource Sharing)
# Allows frontend (e.g. http://localhost:3000) to securely exchange cookies with the backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,     # Allow transmitting httpOnly cookies
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def request_logging_middleware(
    request: Request, call_next: Callable[[Request], Awaitable[Response]]
) -> Response:
    """
    Middleware for end-to-end request tracing and structured logging:
    - Extracts or generates a unique UUID `X-Request-ID`.
    - Stores it in `ContextVar` so all subsequent logs automatically contain this ID.
    - Measures precise request execution duration in milliseconds.
    - Attaches `X-Request-ID` to response headers back to the client.
    """
    # 1. Retrieve request ID from Nginx/client header or generate new random UUID4
    request_id = request.headers.get("X-Request-ID", str(uuid.uuid4()))
    request.state.request_id = request_id
    token = request_id_ctx.set(request_id)

    client_ip = get_client_ip(request)
    start_time = time.perf_counter()

    try:
        # Pass request downstream to router
        response: Response = await call_next(request)

        # Calculate processing duration
        duration_ms = round((time.perf_counter() - start_time) * 1000, 2)

        # Return Request ID in response headers to browser
        response.headers["X-Request-ID"] = request_id

        # Log request (skipping frequent healthcheck pings to prevent log clutter)
        if request.url.path not in ("/health", "/ready"):
            logger.info(
                "%s %s %s (%s ms)",
                request.method,
                request.url.path,
                response.status_code,
                duration_ms,
                extra={
                    "http": {
                        "method": request.method,
                        "path": request.url.path,
                        "status_code": response.status_code,
                        "duration_ms": duration_ms,
                        "client_ip": client_ip,
                    }
                },
            )
        return response
    finally:
        # Clean up context after request completion
        request_id_ctx.reset(token)


# --------------------------------------------------------------------------
# RFC 7807 Error Handlers (Problem Details for HTTP APIs)
# --------------------------------------------------------------------------

@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException) -> JSONResponse:
    """
    Transforms standard HTTPException (400, 401, 403, 404, 429) into RFC 7807 format
    """
    problem = ProblemDetail(
        type=f"https://errors.callsaver.local/{exc.status_code}",
        title=exc.detail if isinstance(exc.detail, str) else "HTTP Error",
        status=exc.status_code,
        detail=str(exc.detail),
        instance=str(request.url),
    )
    return JSONResponse(
        status_code=exc.status_code,
        content=problem.model_dump(exclude_none=True),
        media_type="application/problem+json",
        headers=exc.headers,
    )


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(
    request: Request, exc: RequestValidationError
) -> JSONResponse:
    """
    Transforms Pydantic validation errors (HTTP 422 Unprocessable Entity)
    with detailed field-level error information
    """
    problem = ProblemDetail(
        type="https://errors.callsaver.local/validation-error",
        title="Validation Error",
        status=status.HTTP_422_UNPROCESSABLE_ENTITY,
        detail="The request entity failed validation checks.",
        instance=str(request.url),
        invalid_params=[
            {
                "loc": list(err.get("loc", [])),
                "msg": err.get("msg"),
                "type": err.get("type"),
            }
            for err in exc.errors()
        ],
    )
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content=problem.model_dump(exclude_none=True),
        media_type="application/problem+json",
    )


# --------------------------------------------------------------------------
# System Health Endpoints (Liveness & Readiness)
# Used by Kubernetes, Docker, and Load Balancers
# --------------------------------------------------------------------------

@app.get("/health", response_model=HealthResponse, tags=["health"], summary="Liveness Probe")
async def root_liveness() -> HealthResponse:
    """Verify that the application process is running and responding to requests"""
    return HealthResponse(app=settings.APP_NAME)


@app.get("/ready", response_model=ReadyResponse, tags=["health"], summary="Readiness Probe")
async def root_readiness() -> ReadyResponse:
    """Verify that the service is fully ready to handle incoming user traffic"""
    return ReadyResponse()


# Mount versioned API v1 routers (/api/v1/auth, /api/v1/excuses, /api/v1/sounds)
app.include_router(api_router, prefix=settings.API_V1_PREFIX)
