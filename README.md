# CallSaver («Ой, у меня микрофон сломался»)

Шутливый, но спроектированный по промышленным стандартам сервис (PWA), помогающий вежливо или технически обоснованно «эвакуироваться» с затянувшихся онлайн-созвонов. Включает генератор алиби и отговорок, звуковую деку правдоподобных фоновых шумов (Web Audio API) и учетные записи пользователей.

---

## Архитектура проекта

- **Frontend:** React 19, Vite, TypeScript (strict), Tailwind CSS 4, Zustand (UI-стейт), TanStack Query v5 (серверный стейт), React Router v6, React Hook Form + Zod, Axios с RFC 7807 и JWT-интерцепторами, `sonner`, Vitest.
- **Backend:** FastAPI (async), Python 3.10+, Pydantic v2 + `pydantic-settings`, SQLAlchemy 2.0 async (`asyncpg`), Alembic, PostgreSQL, Redis, PyJWT, ARQ, S3/MinIO.
- **Инфраструктура:** Docker Compose (сервисы `frontend`, `backend`, `postgres`, `redis`, `minio`, `nginx`), GitHub Actions CI.

---

## Быстрый старт (Docker Compose)

1. Скопируйте переменные окружения:
   ```bash
   cp .env.example .env
   ```
2. Запустите весь стек в Docker:
   ```bash
   docker compose up --build
   ```
3. Точки входа:
   - **Frontend:** [http://localhost](http://localhost) (или [http://localhost:3000](http://localhost:3000))
   - **Backend API Docs:** [http://localhost/docs](http://localhost/docs) или [http://localhost:8000/docs](http://localhost:8000/docs)
   - **Liveness Check:** `GET http://localhost/health`
   - **MinIO Console:** [http://localhost:9001](http://localhost:9001)

---

## Локальная разработка без Docker

### Фронтенд
```bash
# Установка зависимостей
npm install

# Запуск dev-сервера (порт 3000)
npm run dev

# Проверка типов
npm run lint

# Запуск тестов Vitest
npm run test

# Сборка продакшн-бандла
npm run build
```

### Бэкенд
```bash
cd backend

# Создание виртуального окружения
python3 -m venv .venv
source .venv/bin/activate

# Установка зависимостей
pip install -r requirements.txt

# Запуск сервера разработки
uvicorn app.main:app --reload --port 8000

# Запуск линтеров и проверок типов
ruff check .
mypy app tests

# Запуск тестов pytest
pytest -v
```

---

## Структура репозитория

```
.
├── backend/                  # FastAPI сервис
│   ├── app/
│   │   ├── api/v1/           # Роутеры версий API
│   │   ├── core/             # Конфигурация (pydantic-settings), безопасность
│   │   ├── schemas/          # Pydantic-схемы (Health, RFC 7807 ProblemDetail)
│   │   └── main.py           # Инициализация FastAPI, middleware, CORS
│   ├── tests/                # Pytest тесты эндпоинтов
│   ├── Dockerfile
│   └── requirements.txt
├── src/                      # Vite + React фронтенд
│   ├── app/                  # Провайдеры, роутер (React Router v6)
│   ├── features/             # Модули звуковой деки, статусов
│   ├── shared/               # Axios API клиент, i18n словарь (ru.ts), UI-компоненты
│   ├── store/                # Zustand хранилище пользовательских настроек (UI-only)
│   ├── widgets/              # Композиционные блоки интерфейса
│   └── test/                 # Тесты Vitest
├── nginx/                    # Конфигурация обратного прокси Nginx
├── docker-compose.yml        # Мультиконтейнерная оркестрация
└── .github/workflows/ci.yml  # CI пайплайн (линтеры, тесты, сборка)
```
