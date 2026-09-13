# CallSaver («Ой, у меня микрофон сломался»)

> **CallSaver** — шутливый по задумке, но спроектированный по бескомпромиссным промышленным стандартам сервис (PWA), помогающий вежливо, технично или абсурдно «эвакуироваться» с затянувшихся онлайн-созвонов и митингов.
> Включает умный генератор алиби и отговорок, звуковую деку правдоподобных фоновых шумов (Web Audio API), загрузку кастомных аудиофайлов в S3/MinIO, систему аккаунтов (JWT в httpOnly cookie), Rate Limiting, PWA-офлайн режим и полный продакшн-контур.

---

## 🏗 Архитектура и стек технологий

Проект разделен на слабосвязанные слои по принципам Clean Architecture и Feature-Sliced Design (FSD):

### Фронтенд (Frontend SPA + PWA)
- **Фреймворк и сборка:** React 19, Vite, TypeScript (strict mode).
- **Стилизация:** Tailwind CSS 4, `clsx`, `tailwind-merge`, `lucide-react` иконки, газета/брутализм дизайн-система.
- **Управление состоянием:**
  - **TanStack Query v5:** *только* серверное состояние (кэширование, инвалидация мутаций, оптимистичные обновления).
  - **Zustand:** *только* клиентские UI-предпочтения (уровень неловкости, активные таймеры, состояние модалок). Данные сервера никогда не дублируются в Zustand.
- **Сетевой уровень:** Axios с перехватчиками для авто-прикрепления Bearer-токена, обработки RFC 7807 ошибок (`application/problem+json`) и прозрачного обновления токенов через `/api/v1/auth/refresh`.
- **Формы и валидация:** React Hook Form + Zod схемы.
- **Звуковой движок:** Web Audio API (`AudioContext`, `GainNode`, `BiquadFilterNode`, кастомные генераторы шума Pink/Brownian/Bandpass). Уровень неловкости меняет громкость мгновенно на аппаратном уровне звуковой карты без перерендера компонентов React.
- **PWA и Офлайн:** `vite-plugin-pwa`, Service Worker с кэшированием статики, Web App Manifest на русском языке, автономный режим с детектором сети и кнопкой установки в один клик.
- **Тестирование:** Vitest + React Testing Library (20+ тестов компонентов и звукового движка).

### Бэкенд (Backend API)
- **Фреймворк:** FastAPI (асинхронный), Python 3.10+.
- **Сервер выполнения:** Gunicorn с воркерами Uvicorn (`uvicorn.workers.UvicornWorker`) в продакшене.
- **База данных и ORM:** PostgreSQL 16, SQLAlchemy 2.0 Async (`asyncpg`), Alembic миграции.
- **Хранилище объектов:** S3-совместимое хранилище (MinIO локально / AWS S3 в проде) с потоковой валидацией MIME и заголовков аудиофайлов до 5 МБ и генерацией presigned URLs.
- **Кэш и Rate Limiting:** Redis 7 (с автоматическим in-memory fallback при недоступности брокера). Лимиты: Auth 5/мин по IP, Upload 20/час на пользователя, Отговорки 60/час на пользователя.
- **Безопасность:** Хеширование паролей bcrypt, короткоживущие JWT Access токены + долгоживущие Refresh токены в защищенных `httpOnly`, `SameSite=Lax` cookie.
- **Логирование:** Структурированный JSON-формат с корреляцией через сквозной `X-Request-ID` и маскированием секретов.

### Инфраструктура
- **Оркестрация:** Docker Compose (6 микросервисов: `frontend`, `backend`, `postgres`, `redis`, `minio`, `nginx`).
- **Обратный прокси:** Nginx 1.25 с edge-rate-limiting, сжатием Gzip, оптимизацией кэширования статических хэшированных файлов и PWA Service Worker.

---

## 🚀 Как запустить проект (Пошаговое руководство)

### Способ 1. Полный запуск в Docker Compose (Рекомендуемый для продакшена)

Это самый простой и надежный способ поднять абсолютно все 6 сервисов одной командой.

#### 1. Подготовка конфигурации
В корне проекта создайте файл `.env` на основе `.env.example`:
```bash
cp .env.example .env
```
*(Для локального тестирования все дефолтные порты и пароли уже согласованы).*

#### 2. Запуск контейнеров
Выполните команду сборки и старта:
```bash
docker compose up --build -d
```

#### 3. Проверка статуса сервисов
```bash
docker compose ps
```
Все контейнеры (`callsaver-frontend`, `callsaver-backend`, `callsaver-postgres`, `callsaver-redis`, `callsaver-minio`, `callsaver-nginx`) перейдут в статус `running` (или `healthy`).

#### 4. Доступ к приложению:
- **Веб-приложение (через Nginx):** [http://localhost](http://localhost)
- **Frontend напрямую:** [http://localhost:3000](http://localhost:3000)
- **Интерактивная документация Swagger/OpenAPI:** [http://localhost/docs](http://localhost/docs) или [http://localhost:8000/docs](http://localhost:8000/docs)
- **Проверка работоспособности (Healthcheck):** `GET http://localhost/health`
- **Консоль хранилища MinIO:** [http://localhost:9001](http://localhost:9001)  
  *(Логин: `minioadmin`, Пароль: `minioadmin`)*
- **PostgreSQL порт:** `localhost:5432` *(база: `callsaver`, логин: `callsaver`, пароль: `callsaver`)*
- **Redis порт:** `localhost:6379`

#### 5. Остановка проекта:
```bash
docker compose down
```
*(Чтобы удалить данные базы данных и хранилища, добавьте флаг `-v`: `docker compose down -v`).*

---

### Способ 2. Локальная разработка (Hybrid / Dev Mode)

Если вы хотите вносить изменения в код с мгновенной перезагрузкой (Hot Reload):

#### Шаг 1. Запуск вспомогательных сервисов (БД, Redis, MinIO)
Запустите только инфраструктурные контейнеры:
```bash
docker compose up -d postgres redis minio
```

#### Шаг 2. Запуск Бэкенда (FastAPI)
1. Перейдите в директорию `backend`:
   ```bash
   cd backend
   ```
2. Создайте и активируйте виртуальное окружение Python:
   ```bash
   python3 -m venv .venv
   source .venv/bin/activate  # На Windows: .venv\Scripts\activate
   ```
3. Установите зависимости:
   ```bash
   pip install -r requirements.txt
   ```
4. Запустите бэкенд в режиме разработки:
   ```bash
   uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
   ```
5. Запуск тестов бэкенда:
   ```bash
   pytest -v
   ```

#### Шаг 3. Запуск Фронтенда (Vite + React)
1. В новом терминале перейдите в корень репозитория:
   ```bash
   npm install
   ```
2. Запустите dev-сервер фронтенда:
   ```bash
   npm run dev
   ```
   Фронтенд откроется по адресу [http://localhost:3000](http://localhost:3000). Все запросы к `/api/*` автоматически проксируются на бэкенд.
3. Проверка типов и линтинг:
   ```bash
   npm run lint
   ```
4. Запуск тестов Vitest:
   ```bash
   npm test
   ```

---

## 📂 Подробная структура модулей для изучения кода

### Frontend (`src/`)

```
src/
├── app/                      # Инициализация приложения
│   └── Providers.tsx         # TanStack Query Client Provider, Toaster, Router
├── audio/                    # Звуковой движок (Web Audio API)
│   ├── engine.ts             # Синтез шумов (перфоратор, дрель, собака, звонок, помехи)
│   └── sounds.ts             # Реестр звуков и категорий
├── entities/                 # Доменные модели TypeScript
│   ├── excuse/               # Модели отговорок и категории (rude, polite, technical, absurd, custom)
│   ├── sound/                # Модели звуков
│   └── user/                 # Модели пользователей и сессий
├── features/                 # Изолированные бизнес-фичи
│   ├── auth/                 # Авторизация, регистрация, модалка AuthModal, аватар UserNav
│   ├── excuses/              # Генератор отговорок, анимация печатания, CustomExcusesManager
│   └── soundboard/           # Кнопки звуков SoundButton, таймер автоотключения, загрузка в S3
├── shared/                   # Переиспользуемые утилиты и UI-кит
│   ├── api/                  # Axios инстанс с авто-рефрешем токенов и RFC 7807
│   ├── i18n/ru.ts            # Все пользовательские русские строки (никакого хардкода в JSX!)
│   ├── pwa/                  # PWA хуки: usePWAInstall, useOnlineStatus, PWAInstallButton
│   └── ui/                   # Скелетоны Skeleton.tsx, кнопки, слайдер неловкости
├── store/                    # Zustand UI-хранилища
│   ├── authUIStore.ts        # Состояние открытия модального окна входа
│   └── soundboardStore.ts    # Уровень неловкости (volume), активные звуки
└── widgets/                  # Крупные составные виджеты страниц
    ├── menu/Menu.tsx         # Верхняя панель со статусом и кнопкой PWA
    ├── generator/            # Секция генератора отговорок
    └── soundboard/           # Секция звуковой деки с категориями и загрузчиком
```

### Backend (`backend/app/`)

```
backend/
├── app/
│   ├── api/                  # Слой HTTP интерфейсов
│   │   ├── deps.py           # FastAPI Dependencies: get_db, get_current_user, rate_limit
│   │   └── v1/               # Версионированные роутеры (/api/v1)
│   │       ├── routers/
│   │       │   ├── auth.py   # /register, /login, /refresh (httpOnly cookie), /me
│   │       │   ├── excuses.py# CRUD отговорок, /random, пагинация, soft-delete
│   │       │   ├── sounds.py # Список звуков, загрузка аудио в S3/MinIO
│   │       │   └── health.py # /health (liveness), /ready (readiness)
│   ├── core/                 # Инфраструктурное ядро
│   │   ├── config.py         # Pydantic Settings с чтением из .env
│   │   ├── database.py       # SQLAlchemy 2.0 async engine и sessionmaker
│   │   ├── logging.py        # Structured JSON Formatter со сквозным request_id
│   │   ├── rate_limit.py     # Redis RateLimiter с атомарным pipeline и in-memory fallback
│   │   ├── redis.py          # Пул подключений aioredis с graceful деградацией
│   │   ├── security.py       # bcrypt хеширование, выпуск/проверка JWT токенов
│   │   └── seeds.py          # Сидирование системных отговорок при первом старте
│   ├── models/               # SQLAlchemy ORM сущности (User, Excuse, Sound)
│   ├── repositories/         # Паттерн Repository (чистые запросы к БД)
│   ├── schemas/              # Pydantic v2 DTO схемы запросов и ответов
│   ├── services/             # Бизнес-логика приложения (AuthService, ExcuseService, SoundService)
│   └── main.py               # Точка входа FastAPI, CORS, middleware, RFC 7807 хэндлеры
├── gunicorn_conf.py          # Продакшн-конфигурация Gunicorn + Uvicorn воркеров
├── Dockerfile                # Контейнеризация Python 3.11-slim
└── requirements.txt          # Закрепленные зависимости
```

---

## 🛡 Продакшн-механизмы (Hardening)

1. **Rate Limiting (§6):**
   - Роуты авторизации (`/auth/register`, `/auth/login`, `/auth/refresh`): максимум 5 запросов в минуту на IP-адрес.
   - Загрузка аудио (`/sounds/upload`): максимум 20 файлов в час на авторизованного пользователя.
   - Создание отговорок (`POST /excuses`): максимум 60 отговорок в час на пользователя.
   - При превышении отдается стандартный RFC 7807 ответ с HTTP 429 и заголовком `Retry-After`.

2. **Структурированное логирование (§8):**
   - Все логи выводятся в виде JSON-строк (`timestamp`, `level`, `message`, `request_id`, `http.method`, `http.duration_ms`).
   - Идентификаторы запросов автоматически пробрасываются через middleware в заголовке ответа `X-Request-ID`.
   - Пароли, секреты и авторизационные токены автоматически маскируются функцией `sanitize_data`.

3. **Nginx Reverse Proxy & Edge Defense:**
   - Буферизация и ограничение максимального тела запроса (`client_max_body_size 10M`).
   - Защитные заголовки: `X-Content-Type-Options: nosniff`, `X-Frame-Options: SAMEORIGIN`, `Referrer-Policy: strict-origin-when-cross-origin`.
   - Долгосрочное кэширование статических файлов с уникальными хэшами (`max-age=31536000, immutable`) и мгновенное обновление Service Worker (`no-cache`).

---

## 🧪 Запуск тестов

- **Фронтенд тесты (Vitest):**
  ```bash
  npm test
  ```
  *(Проверяет авторизацию, работу звукового движка Web Audio API, таймеры автоотключения, генерацию отговорок и PWA-модули).*

- **Бэкенд тесты (Pytest):**
  ```bash
  cd backend && pytest -v
  ```
  *(Проверяет liveness/readiness, регистрацию, выдачу токенов, CRUD отговорок, валидацию аудиофайлов и работу Rate Limiter).*

---

## 📋 Статус реализации дорожной карты (Roadmap)

- [x] **M0 — Skeleton:** Базовая инфраструктура, Docker Compose, FastAPI health/ready, Vite + Tailwind + shadcn.
- [x] **M1 — Auth:** Регистрация, вход, JWT access + httpOnly refresh cookie, роут `/me`, UI-модалка.
- [x] **M2 — Excuses:** CRUD отговорок, категории (`rude`, `polite`, `technical`, `absurd`, `custom`), кнопка «Дай отговорку», печатная машинка.
- [x] **M3 — Soundboard (static):** 4 категории фоновых шумов, процедурный Web Audio API синтез, слайдер неловкости, автоотключение по таймеру.
- [x] **M4 — Uploads:** Интеграция с S3/MinIO, загрузка кастомных звуков до 5 МБ/30 сек, проверка MIME-типов и заголовков.
- [x] **M5 — PWA + polish:** Service Worker, офлайн-режим, Web App Manifest, кнопка установки в 1 клик, анимированные скелетоны загрузки, sonner-уведомления.
- [x] **M6 — Prod hardening:** Защита от брутфорса и флуда (Rate Limiting на Redis с memory-fallback), структурированное JSON-логирование, корреляция по `X-Request-ID`, Gunicorn + Uvicorn workers, Nginx reverse proxy с security headers.
