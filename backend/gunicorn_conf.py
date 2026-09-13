import multiprocessing
import os

# Gunicorn configuration file for CallSaver Backend (Production Hardening - §4, §11)

# Bind socket
bind = os.getenv("BIND", "0.0.0.0:8000")

# Worker configuration
# Recommended: (2 * CPU cores) + 1, or override via WEB_CONCURRENCY env var
default_workers = (multiprocessing.cpu_count() * 2) + 1
workers = int(os.getenv("WEB_CONCURRENCY", min(default_workers, 8)))

# High-performance async worker utilizing Uvicorn's event loop
worker_class = "uvicorn.workers.UvicornWorker"

# Worker lifecycle & timeouts
timeout = int(os.getenv("TIMEOUT", 120))
graceful_timeout = int(os.getenv("GRACEFUL_TIMEOUT", 30))
keepalive = int(os.getenv("KEEPALIVE", 65))
max_requests = int(os.getenv("MAX_REQUESTS", 10000))
max_requests_jitter = int(os.getenv("MAX_REQUESTS_JITTER", 1000))

# Logging: stdout/stderr streaming for container log aggregators
accesslog = "-"
errorlog = "-"
loglevel = os.getenv("LOG_LEVEL", "info")

# Process naming
proc_name = "callsaver-backend"


def on_starting(server):
    server.log.info("CallSaver backend Gunicorn master starting...")


def worker_int(worker):
    worker.log.info("Worker received INT or QUIT signal (pid: %s)", worker.pid)


def worker_abort(worker):
    worker.log.error("Worker received SIGABRT signal (pid: %s)", worker.pid)
