/**
 * ============================================================================
 * shared/api/client.ts — Axios HTTP Client with JWT Auth & Automatic Token Refresh
 * ============================================================================
 * 
 * Educational guide for web application security (JWT + Cookies):
 * 
 * 1. Why is the Access token kept only in-memory (`accessToken = token`) and not in LocalStorage?
 *    - XSS mitigation: malicious scripts cannot steal tokens stored in JS memory,
 *      whereas any injected script can read LocalStorage.
 * 2. Why is the Refresh token stored in an `httpOnly` Cookie?
 *    - The `httpOnly` flag makes the cookie inaccessible to JavaScript (`document.cookie` cannot view it).
 *      The browser sends it automatically with requests to `/api/v1/auth/refresh`.
 * 3. Request retry queue (`failedQueue`):
 *    - If 3 parallel requests return 401 (expired token), the client avoids sending 3 refresh requests.
 *      It initiates ONE request to `/refresh` while enqueuing other requests in `failedQueue`.
 *    - Once the new token arrives, all queued requests replay seamlessly with the fresh token.
 * 4. RFC 7807 (Problem Details):
 *    - Standardized error payload formatting in `application/problem+json`
 *      ({ type, title, status, detail, instance }).
 */

import axios, { type AxiosError, type InternalAxiosRequestConfig } from "axios";

/**
 * Standard RFC 7807 (Problem Details) schema
 */
export interface ProblemDetailResponse {
  type: string;
  title: string;
  status: number;
  detail?: string;
  instance?: string;
  invalid_params?: Array<{ loc: string[]; msg: string; type: string }>;
}

// Create configured Axios instance
export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "",
  withCredentials: true, // REQUIRED: send httpOnly cookies with requests
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json, application/problem+json",
  },
});

// Access token is kept only in module memory (RAM)
let accessToken: string | null = null;

export function setAccessToken(token: string | null) {
  accessToken = token;
}

export function getAccessToken(): string | null {
  return accessToken;
}

/**
 * Request Interceptor:
 * Injects `Authorization: Bearer <token>` header if access token exists in memory.
 */
apiClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  if (accessToken && config.headers) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

// Flag indicating a token refresh operation is actively in flight
let isRefreshing = false;

// Queue of pending requests waiting for a token refresh to finish
let failedQueue: Array<{
  resolve: (value?: unknown) => void;
  reject: (reason?: unknown) => void;
}> = [];

/**
 * Process queued requests after refresh completes or fails
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
 * Response Interceptor:
 * Catches 401 Unauthorized errors (excluding login/register/refresh endpoints),
 * requests a fresh Access token via the httpOnly Refresh cookie,
 * and replays the original request transparently.
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
      // If another request already started a refresh, queue this request
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

      // Mark request to prevent infinite loops
      originalRequest._retry = true;
      isRefreshing = true;

      try {
        // Request fresh access token (Refresh cookie sent automatically by browser)
        const { data } = await axios.post<{ access_token: string }>(
          `${import.meta.env.VITE_API_URL || ""}/api/v1/auth/refresh`,
          {},
          { withCredentials: true }
        );
        const newToken = data.access_token;
        setAccessToken(newToken);

        // Resume all queued requests
        processQueue(null, newToken);

        // Replay failed request with new access token
        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${newToken}`;
        }
        return apiClient(originalRequest);
      } catch (refreshError) {
        // If refresh fails (e.g. session expired), clear auth state
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
