"""
==============================================================================
backend/app/core/logging.py — Структурированное JSON-логирование для Production
==============================================================================

Учебный путеводитель по промышленному логированию (Production Logging):

1. Почему в продакшене логируют в JSON, а не обычным текстом?
   - В микросервисных архитектурах логи собираются централизованно через агенты
     (Fluentbit, Logstash, Vector) и отправляются в Elasticsearch, Grafana Loki или Datadog.
   - Парсить регулярными выражениями простой текст долго и ненадежно. JSON парсится моментально,
     и по каждому полю (`request_id`, `http.status_code`, `http.duration_ms`) можно строить
     графики, фильтровать ошибки и настраивать алерты.

2. Что такое `ContextVar` и зачем он нужен?
   - В асинхронном коде Python (`asyncio`) сотни запросов обрабатываются в одном потоке
     одновременно через Event Loop. Стандартный `threading.local()` не работает!
   - `ContextVar` хранит данные локально для каждой асинхронной задачи (Task).
     Когда запрос приходит, мы кладем `request_id` в `request_id_ctx`, и ЛЮБОЙ лог
     внутри этого запроса автоматически получает нужный `request_id`.

3. Маскирование секретов (`sanitize_data`):
   - Огромная проблема в безопасности — случайный лог пароля, токена или API-ключа в stdout.
   - Функция `sanitize_data` рекурсивно проверяет все словари и заменяет значения
     чувствительных ключей на `[MASKED]`.
"""

import json
import logging
import sys
from contextvars import ContextVar
from datetime import datetime, timezone
from typing import Any

# Переменная контекста для связи всех асинхронных логов с конкретным HTTP-запросом
request_id_ctx: ContextVar[str | None] = ContextVar("request_id", default=None)

# Список ключей, значения которых категорически запрещено выводить в открытом виде
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
    """
    Рекурсивно маскирует значения конфиденциальных полей в словарях и списках.
    """
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
    Форматтер логов, выводящий каждую запись в виде валидной JSON-строки.
    """

    def format(self, record: logging.LogRecord) -> str:
        # Дата и время события в формате UTC ISO-8601
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

        # Если лог происходит в контексте HTTP-запроса — добавляем его сквозной ID
        req_id = request_id_ctx.get()
        if req_id:
            log_payload["request_id"] = req_id

        # Если произошло исключение — прикрепляем форматированный стек вызовов
        if record.exc_info:
            log_payload["exception"] = self.formatException(record.exc_info)

        # Если переданы дополнительные параметры через extra={...}
        if hasattr(record, "extra") and isinstance(record.extra, dict):  # type: ignore[attr-defined]
            log_payload["extra"] = sanitize_data(record.extra)  # type: ignore[attr-defined]

        return json.dumps(log_payload, ensure_ascii=False)


def setup_logging(app_env: str = "development") -> None:
    """
    Настройка корневого логгера и логгеров серверов Uvicorn / Gunicorn.
    """
    root_logger = logging.getLogger()
    log_level = logging.INFO if app_env != "development" else logging.DEBUG
    root_logger.setLevel(log_level)

    # Очищаем дефолтные обработчики, чтобы избежать дублирования строк в консоли
    for handler in list(root_logger.handlers):
        root_logger.removeHandler(handler)

    stream_handler = logging.StreamHandler(sys.stdout)
    stream_handler.setFormatter(StructuredJSONFormatter())
    root_logger.addHandler(stream_handler)

    # Перенаправляем логи веб-серверов Uvicorn и Gunicorn в единый JSON-форматтер
    for logger_name in ("uvicorn", "uvicorn.access", "uvicorn.error", "gunicorn.access", "gunicorn.error"):
        srv_logger = logging.getLogger(logger_name)
        srv_logger.handlers = [stream_handler]
        srv_logger.propagate = False
