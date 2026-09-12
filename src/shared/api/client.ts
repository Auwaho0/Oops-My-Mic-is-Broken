import axios, { type AxiosError } from "axios";

export interface ProblemDetailResponse {
  type: string;
  title: string;
  status: number;
  detail?: string;
  instance?: string;
  invalid_params?: Array<{ loc: string[]; msg: string; type: string }>;
}

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "",
  withCredentials: true, // required for httpOnly refresh cookies (§6)
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json, application/problem+json",
  },
});

let accessToken: string | null = null;

export function setAccessToken(token: string | null) {
  accessToken = token;
}

export function getAccessToken(): string | null {
  return accessToken;
}

apiClient.interceptors.request.use((config) => {
  if (accessToken && config.headers) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<ProblemDetailResponse>) => {
    // Handling RFC 7807 Problem Detail errors or 401 token refresh flow (M1)
    return Promise.reject(error);
  }
);
