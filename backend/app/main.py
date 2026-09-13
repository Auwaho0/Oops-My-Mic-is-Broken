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

settings = get_settings()

# Initialize structured JSON logging (§8)
setup_logging(settings.APP_ENV)
logger = logging.getLogger("callsaver.app")


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    logger.info("Application starting up in %s mode", settings.APP_ENV)
    # Startup logic - seed system excuses
    try:
        async with AsyncSessionLocal() as session:
            await seed_system_excuses(session)
        logger.info("System excuses seeded successfully.")
    except Exception as exc:
        logger.warning("Could not seed system excuses on startup: %s", exc)
    yield
    # Shutdown logic - clean up Redis connections
    logger.info("Application shutting down...")
    await close_redis_client()


app = FastAPI(
    title=settings.APP_NAME,
    description="Playful but production-grade PWA for escaping online calls.",
    version="0.1.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
)

# CORS Middleware (§6)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Request ID & Structured HTTP Access Logging Middleware (§8)
@app.middleware("http")
async def request_logging_middleware(
    request: Request, call_next: Callable[[Request], Awaitable[Response]]
) -> Response:
    # 1. Resolve or generate Request ID
    request_id = request.headers.get("X-Request-ID", str(uuid.uuid4()))
    request.state.request_id = request_id
    token = request_id_ctx.set(request_id)

    client_ip = get_client_ip(request)
    start_time = time.perf_counter()

    try:
        response: Response = await call_next(request)
        duration_ms = round((time.perf_counter() - start_time) * 1000, 2)

        # Attach Request ID to response headers
        response.headers["X-Request-ID"] = request_id

        # Skip spamming logs for frequent health checks
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
        request_id_ctx.reset(token)


# RFC 7807 Problem Detail Handlers (§6)
@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException) -> JSONResponse:
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


# Top-level Health Endpoints (§6)
@app.get("/health", response_model=HealthResponse, tags=["health"], summary="Liveness")
async def root_liveness() -> HealthResponse:
    return HealthResponse(app=settings.APP_NAME)


@app.get("/ready", response_model=ReadyResponse, tags=["health"], summary="Readiness")
async def root_readiness() -> ReadyResponse:
    return ReadyResponse()


# Versioned API routes
app.include_router(api_router, prefix=settings.API_V1_PREFIX)
