# CallSaver («Ой, у меня микрофон сломался»)

> **EN:** Playful in concept, uncompromising in engineering. A production-grade Progressive Web App (PWA) designed to help users politely, technically, or absurdly "escape" from unwanted online calls and meetings.  
> **RU:** Шутливый по задумке, но спроектированный по бескомпромиссным промышленным стандартам сервис (PWA), помогающий вежливо, технично или абсурдно «эвакуироваться» с затянувшихся онлайн-созвонов и рабочих митингов.

---

## 💡 О проекте / About this Project (Vibecoding & Educational Reference)

### 🇷🇺 Для изучающих веб-разработку (На русском)
**CallSaver** — это эталонный **вайбкод-проект для практического обучения (vibecoding learning project)**.
- **В чем суть концепта «Вайбкодинг»?** Проект родился из живой, весёлой идеи («хочу кнопку, которая шумит дрелью в микрофон или выдает отговорку, почему мне нужно срочно уйти с созвона»), но реализован с соблюдением стандартов взрослой энтерпрайз-разработки.
- **Для кого этот проект?** Если вы новичок или разработчик среднего уровня, который уже немного разбирается в **React** и **Python**, но хочет увидеть, как устроен **настоящий Full-Stack продакшн**:
  - как правильно разделять состояние (серверное в *TanStack Query*, клиентское в *Zustand*);
  - как генерировать звук процедурно через *Web Audio API* без подгрузки тяжёлых MP3;
  - как строить чистую архитектуру на *FastAPI* с роутерами, сервисами, репозиториями и SQLAlchemy 2.0;
  - как безопасно хранить JWT в *httpOnly cookies*, защищаться от флуда (*Rate Limiting*) и настраивать *Nginx + Docker*.
- **Код как учебник:** Весь исходный код снабжен понятными англоязычными комментариями, объясняющими не только *что* делает строчка, но и *почему* выбран именно такой архитектурный паттерн.

### 🇬🇧 For Learners & Developers (In English)
**CallSaver** is a showcase **vibecoding & educational reference project** created for real-world study.
- **What is "Vibecoding"?** Taking a fun, creative, and meme-worthy everyday idea ("I need a button to realistically simulate a jackhammer or baby crying to hang up on an awkward Zoom call") and engineering it with zero compromises, using industry-standard architectures.
- **Who is this for?** Perfect for developers with basic familiarity in React and Python who want to examine a production-grade full-stack architecture:
  - Strict separation of concerns (Clean Architecture / Feature-Sliced Design);
  - Hardware-accelerated audio synthesis via browser Web Audio API;
  - Asynchronous FastAPI backend with SQLAlchemy 2.0, Alembic, and Redis rate limiting;
  - Secure authentication with short-lived access tokens and httpOnly refresh cookies;
  - Enterprise container orchestration with Docker Compose and Nginx reverse proxy.

---

## 📦 Нужно ли скачивать библиотеки? (Docker vs Ручная установка) / Do I need to install libraries?

Частый вопрос новичков: **«Какие библиотеки мне нужно скачивать вручную, или они скачаются сами с Docker?»**

### Вариант 1: Запуск через Docker (Ничего скачивать вручную НЕ нужно! ⭐️)
Если у вас установлен **Docker** и **Docker Compose**:
- **Вам НЕ нужно** устанавливать Python, Node.js, PostgreSQL или Redis на свой компьютер.
- **Вам НЕ нужно** писать `npm install` или `pip install`.
- Docker автоматически прочитает файлы:
  - `package.json` — и сам скачает все фронтенд-библиотеки внутри контейнера `callsaver-frontend`;
  - `backend/requirements.txt` — и сам установит все бэкенд-зависимости внутри контейнера `callsaver-backend`.
- **Все 6 сервисов запустятся одной-единственной командой:**
  ```bash
  docker compose up --build -d
  ```

---

### Вариант 2: Запуск без Docker (Ручная установка библиотек для экспериментов)
Если вы хотите запускать код напрямую на своём компьютере, чтобы быстро менять файлы в редакторе:

#### 1. Фронтенд библиотеки (Node.js & npm):
Установите **Node.js (версии 18 или 20+)**. Затем в корне проекта выполните:
```bash
npm install
```
Менеджер `npm` автоматически скачает из `package.json` следующие ключевые библиотеки:
- `react`, `react-dom` (v19) — основа интерфейса;
- `vite` — ультрабыстрый сборщик и dev-сервер;
- `typescript` — строгая типизация;
- `@tanstack/react-query` — управление серверными запросами и кэшем;
- `zustand` — легковесное локальное состояние UI;
- `tailwindcss` — современная стилизация утилитарными классами;
- `axios` — HTTP-клиент с интерцепторами;
- `react-hook-form` + `zod` — формы и валидация;
- `lucide-react` — векторные иконки;
- `sonner` — всплывающие toast-уведомления;
- `vite-plugin-pwa` — офлайн-режим и PWA Service Worker.

#### 2. Бэкенд библиотеки (Python & pip):
Установите **Python (версии 3.10, 3.11 или 3.12)**. Перейдите в папку `backend` и установите зависимости:
```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate  # На Windows: .venv\Scripts\activate
pip install -r requirements.txt
```
Установщик `pip` автоматически скачает:
- `fastapi` — современный асинхронный веб-фреймворк;
- `uvicorn`, `gunicorn` — высокопроизводительные ASGI-серверы;
- `sqlalchemy` (v2.0 async) + `asyncpg` — асинхронная ORM и драйвер PostgreSQL;
- `alembic` — миграции базы данных;
- `pydantic`, `pydantic-settings` — валидация данных и чтение `.env`;
- `pyjwt` + `passlib[bcrypt]` — генерация JWT токенов и хеширование паролей;
- `redis` — асинхронный клиент для кэша и защиты от флуда (Rate Limiter);
- `boto3` — клиент для работы с S3/MinIO хранилищем файлов;
- `pytest`, `httpx` — автотесты API.

---

## 🚀 Пошаговое руководство по запуску / How to Run

### 🛠 Способ 1. Запуск за 1 минуту через Docker (Рекомендуется)

1. **Скопируйте файл конфигурации окружения:**
   ```bash
   cp .env.example .env
   ```
   *(Файл `.env.example` уже содержит готовые настройки по умолчанию для локального запуска).*

2. **Соберите и запустите все 6 контейнеров:**
   ```bash
   docker compose up --build -d
   ```

3. **Проверьте статус сервисов:**
   ```bash
   docker compose ps
   ```
   Все сервисы (`callsaver-frontend`, `callsaver-backend`, `callsaver-postgres`, `callsaver-redis`, `callsaver-minio`, `callsaver-nginx`) должны быть в состоянии `Up` или `healthy`.

4. **Откройте приложение в браузере:**
   - 🌐 **Основной сайт (через Nginx):** [http://localhost](http://localhost)
   - 💻 **Frontend напрямую:** [http://localhost:3000](http://localhost:3000)
   - 📖 **Интерактивная документация Swagger API:** [http://localhost/docs](http://localhost/docs) (или [http://localhost:8000/docs](http://localhost:8000/docs))
   - 🗄 **MinIO хранилище (файлы звуков):** [http://localhost:9001](http://localhost:9001) *(логин: `minioadmin`, пароль: `minioadmin`)*
   - ❤️ **Healthcheck API:** `GET http://localhost/health`

5. **Остановка проекта:**
   ```bash
   docker compose down
   ```

---

### 💻 Способ 2. Гибридный запуск для локальной разработки (Dev Mode)

Если вы хотите вносить изменения в код бэкенда или фронтенда и сразу видеть результат:

1. **Запустите только базы данных в фоне через Docker:**
   ```bash
   docker compose up -d postgres redis minio
   ```

2. **Запустите FastAPI сервер бэкенда:**
   ```bash
   cd backend
   python3 -m venv .venv
   source .venv/bin/activate  # Windows: .venv\Scripts\activate
   pip install -r requirements.txt
   uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
   ```

3. **В отдельном терминале запустите React фронтенд:**
   ```bash
   npm install
   npm run dev
   ```
   Откройте [http://localhost:3000](http://localhost:3000). Благодаря настроенному Vite proxy все вызовы `/api/*` будут автоматически отправляться на ваш бэкенд на порту 8000.

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
