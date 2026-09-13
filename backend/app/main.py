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

# Загружаем настройки из переменных окружения (.env)
settings = get_settings()

# Инициализируем структурированное JSON-логирование
setup_logging(settings.APP_ENV)
logger = logging.getLogger("callsaver.app")


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """
    Управление жизненным циклом (Startup & Shutdown) приложения.
    """
    logger.info("Application starting up in %s mode", settings.APP_ENV)
    
    # 1. При запуске: проверяем подключение к БД и сидируем базовые отговорки
    try:
        async with AsyncSessionLocal() as session:
            await seed_system_excuses(session)
        logger.info("System excuses seeded successfully.")
    except Exception as exc:
        logger.warning("Could not seed system excuses on startup: %s", exc)
        
    yield  # В этот момент приложение активно и обрабатывает запросы пользователей
    
    # 2. При завершении: корректно закрываем соединения с Redis
    logger.info("Application shutting down...")
    await close_redis_client()


# Создание экземпляра приложения FastAPI
app = FastAPI(
    title=settings.APP_NAME,
    description="Playful but production-grade PWA for escaping online calls.",
    version="0.1.0",
    lifespan=lifespan,
    docs_url="/docs",            # Интерактивная документация Swagger UI
    redoc_url="/redoc",          # Альтернативная документация ReDoc
    openapi_url="/openapi.json", # OpenAPI спецификация схемы API
)

# Настройка CORS (Cross-Origin Resource Sharing)
# Позволяет фронтенду (например, http://localhost:3000) безопасно обмениваться cookies с бэкендом
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,     # Разрешаем отправку httpOnly cookies
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def request_logging_middleware(
    request: Request, call_next: Callable[[Request], Awaitable[Response]]
) -> Response:
    """
    Middleware сквозного логирования и трассировки запросов:
    - Извлекает или генерирует уникальный UUID `X-Request-ID`.
    - Сохраняет его в `ContextVar`, чтобы все последующие логи автоматически содержали этот ID.
    - Измеряет точное время выполнения запроса в миллисекундах.
    - Добавляет `X-Request-ID` в заголовки ответа клиенту.
    """
    # 1. Получаем ID запроса от Nginx/клиента или создаем новый случайный UUID4
    request_id = request.headers.get("X-Request-ID", str(uuid.uuid4()))
    request.state.request_id = request_id
    token = request_id_ctx.set(request_id)

    client_ip = get_client_ip(request)
    start_time = time.perf_counter()

    try:
        # Передаем запрос дальше по цепочке в роутер
        response: Response = await call_next(request)
        
        # Считаем длительность обработки
        duration_ms = round((time.perf_counter() - start_time) * 1000, 2)

        # Возвращаем Request ID в заголовках ответа браузеру
        response.headers["X-Request-ID"] = request_id

        # Логируем запрос (пропуская частые проверки healthcheck, чтобы не засорять логи)
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
        # Очищаем контекст после завершения запроса
        request_id_ctx.reset(token)


# --------------------------------------------------------------------------
# RFC 7807 Обработчики ошибок (Problem Details for HTTP APIs)
# --------------------------------------------------------------------------

@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException) -> JSONResponse:
    """
    Преобразует стандартные HTTPException (400, 401, 403, 404, 429) в RFC 7807 формат
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
    )


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(
    request: Request, exc: RequestValidationError
) -> JSONResponse:
    """
    Преобразует ошибки валидации Pydantic (HTTP 422 Unprocessable Entity)
    с детальной информацией о некорректных полях
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
# Системные эндпоинты проверки жизнеспособности (Liveness & Readiness)
# Используются Kubernetes, Docker и балансировщиками нагрузки
# --------------------------------------------------------------------------

@app.get("/health", response_model=HealthResponse, tags=["health"], summary="Liveness Probe")
async def root_liveness() -> HealthResponse:
    """Проверка того, что процесс приложения жив и отвечает на запросы"""
    return HealthResponse(app=settings.APP_NAME)


@app.get("/ready", response_model=ReadyResponse, tags=["health"], summary="Readiness Probe")
async def root_readiness() -> ReadyResponse:
    """Проверка готовности сервиса принимать рабочий пользовательский трафик"""
    return ReadyResponse()


# Подключение версионированных роутеров API v1 (/api/v1/auth, /api/v1/excuses, /api/v1/sounds)
app.include_router(api_router, prefix=settings.API_V1_PREFIX)
