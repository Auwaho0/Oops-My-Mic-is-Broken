/**
 * ============================================================================
 * shared/api/client.ts — HTTP-клиент Axios с JWT-авторизацией и авто-обновлением
 * ============================================================================
 * 
 * Учебное пособие для новичков по безопасности веб-приложений (JWT + Cookies):
 * 
 * 1. Почему Access-токен хранится в памяти (`accessToken = token`), а не в LocalStorage?
 *    - Защита от XSS: вредоносные скрипты не могут украсть токен из памяти JS,
 *      в то время как к LocalStorage имеет доступ любой запущенный скрипт.
 * 2. Почему Refresh-токен лежит в Cookie с флагом `httpOnly`?
 *    - Флаг `httpOnly` делает куку невидимой для JavaScript (`document.cookie` её не видит).
 *      Браузер отправляет её на сервер автоматически при вызове `/api/v1/auth/refresh`.
 * 3. Как работает очередь повторных запросов (`failedQueue`):
 *    - Если пользователь открыл страницу, и 3 запроса одновременно вернули 401 (токен протух),
 *      клиент не шлёт 3 запроса на обновление! Он шлёт только ОДИН запрос к `/refresh`,
 *      а остальные запросы ставит на паузу в промис-очередь `failedQueue`.
 *    - Как только новый токен получен, все стоявшие на паузе запросы повторяются с новым токеном.
 * 4. RFC 7807 (Problem Details):
 *    - Стандарт возврата ошибок с сервера в формате `application/problem+json`
 *      ({ type, title, status, detail, instance }).
 */

import axios, { type AxiosError, type InternalAxiosRequestConfig } from "axios";

/**
 * Структура стандартной ошибки RFC 7807 (Problem Details)
 */
export interface ProblemDetailResponse {
  type: string;
  title: string;
  status: number;
  detail?: string;
  instance?: string;
  invalid_params?: Array<{ loc: string[]; msg: string; type: string }>;
}

// Создаём настроенный инстанс Axios
export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "",
  withCredentials: true, // ОБЯЗАТЕЛЬНО: отправлять httpOnly cookies с каждым запросом
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json, application/problem+json",
  },
});

// Access-токен хранится только в переменной модуля (в оперативной памяти)
let accessToken: string | null = null;

export function setAccessToken(token: string | null) {
  accessToken = token;
}

export function getAccessToken(): string | null {
  return accessToken;
}

/**
 * Request Interceptor (Перехватчик исходящих запросов):
 * Автоматически подставляет заголовок `Authorization: Bearer <token>` во все запросы,
 * если токен присутствует в памяти.
 */
apiClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  if (accessToken && config.headers) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

// Флаг того, что процесс обновления токена уже запущен
let isRefreshing = false;

// Очередь запросов, ожидающих завершения обновления токена
let failedQueue: Array<{
  resolve: (value?: unknown) => void;
  reject: (reason?: unknown) => void;
}> = [];

/**
 * Обработка очереди ожидающих запросов
 */
const processQueue = (error: unknown, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

/**
 * Response Interceptor (Перехватчик входящих ответов):
 * Если сервер возвращает 401 Unauthorized (и это не попытка логина/рефреша),
 * мы прозрачно для пользователя запрашиваем новый Access-токен по Refresh-куке
 * и повторяем оригинальный запрос.
 */
apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<ProblemDetailResponse>) => {
    const originalRequest = error.config as (InternalAxiosRequestConfig & { _retry?: boolean }) | undefined;

    if (
      error.response?.status === 401 &&
      originalRequest &&
      !originalRequest._retry &&
      !originalRequest.url?.includes("/auth/refresh") &&
      !originalRequest.url?.includes("/auth/login") &&
      !originalRequest.url?.includes("/auth/register")
    ) {
      // Если другой запрос уже запустил обновление токена — встаём в очередь ожидания
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            if (originalRequest.headers && token) {
              originalRequest.headers.Authorization = `Bearer ${token}`;
            }
            return apiClient(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      // Помечаем запрос, чтобы не уйти в бесконечный цикл повторов
      originalRequest._retry = true;
      isRefreshing = true;

      try {
        // Запрашиваем новый токен (Refresh токен уйдёт сам в cookie)
        const { data } = await axios.post<{ access_token: string }>(
          `${import.meta.env.VITE_API_URL || ""}/api/v1/auth/refresh`,
          {},
          { withCredentials: true }
        );
        const newToken = data.access_token;
        setAccessToken(newToken);

        // Разблокируем все запросы, которые ждали в очереди
        processQueue(null, newToken);

        // Повторяем упавший запрос с новым токеном
        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${newToken}`;
        }
        return apiClient(originalRequest);
      } catch (refreshError) {
        // Если даже рефреш провалился (например, сессия истекла через 30 дней) — сбрасываем авторизацию
        processQueue(refreshError, null);
        setAccessToken(null);
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);
