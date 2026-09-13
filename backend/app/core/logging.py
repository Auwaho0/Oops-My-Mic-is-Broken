import json
import logging
import sys
from contextvars import ContextVar
from datetime import datetime, timezone
from typing import Any

# Context variable for correlating asynchronous logs with the incoming HTTP request ID (§8)
request_id_ctx: ContextVar[str | None] = ContextVar("request_id", default=None)

# Sensitive field keys to automatically mask if logged accidentally (§8)
SENSITIVE_KEYS = {
    "password",
    "access_token",
    "refresh_token",
    "authorization",
    "jwt_secret",
    "s3_secret_key",
    "secret",
}


def sanitize_data(data: Any) -> Any:
    """Recursively mask sensitive values in dictionaries and lists."""
    if isinstance(data, dict):
        sanitized = {}
        for k, v in data.items():
            if str(k).lower() in SENSITIVE_KEYS:
                sanitized[k] = "[MASKED]"
            else:
                sanitized[k] = sanitize_data(v)
        return sanitized
    elif isinstance(data, (list, tuple)):
        return [sanitize_data(item) for item in data]
    return data


class StructuredJSONFormatter(logging.Formatter):
    """
    RFC-compliant Structured JSON log formatter.
    Outputs structured log lines for ingestion by log collectors (ELK, Datadog, CloudWatch, GCP Cloud Logging).
    """

    def format(self, record: logging.LogRecord) -> str:
        # UTC ISO-8601 timestamp
        now = datetime.now(timezone.utc).isoformat()

        log_payload: dict[str, Any] = {
            "timestamp": now,
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
            "module": record.module,
            "function": record.funcName,
            "line": record.lineno,
        }

        # Correlate with current HTTP request if available (§8)
        req_id = request_id_ctx.get()
        if req_id:
            log_payload["request_id"] = req_id

        # Attach exception trace if present
        if record.exc_info:
            log_payload["exception"] = self.formatException(record.exc_info)

        # Attach custom extra fields passed to logger.info(..., extra={...})
        if hasattr(record, "extra") and isinstance(record.extra, dict):  # type: ignore[attr-defined]
            log_payload["extra"] = sanitize_data(record.extra)  # type: ignore[attr-defined]

        return json.dumps(log_payload, ensure_ascii=False)


def setup_logging(app_env: str = "development") -> None:
    """
    Configures root and application loggers to output structured JSON in production,
    or human-readable format in local development if desired.
    """
    root_logger = logging.getLogger()
    log_level = logging.INFO if app_env != "development" else logging.DEBUG
    root_logger.setLevel(log_level)

    # Remove existing handlers to avoid duplicate log lines
    for handler in list(root_logger.handlers):
        root_logger.removeHandler(handler)

    stream_handler = logging.StreamHandler(sys.stdout)
    stream_handler.setFormatter(StructuredJSONFormatter())
    root_logger.addHandler(stream_handler)

    # Align uvicorn and gunicorn loggers with structured format
    for logger_name in ("uvicorn", "uvicorn.access", "uvicorn.error", "gunicorn.access", "gunicorn.error"):
        srv_logger = logging.getLogger(logger_name)
        srv_logger.handlers = [stream_handler]
        srv_logger.propagate = False
