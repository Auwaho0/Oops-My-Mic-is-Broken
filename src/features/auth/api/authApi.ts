import { apiClient, setAccessToken } from "@/shared/api/client";
import type { TokenResponse, User } from "@/entities/user/types";

export interface AuthCredentials {
  email: string;
  password: string;
}

export const authApi = {
  async register(credentials: AuthCredentials): Promise<TokenResponse> {
    const response = await apiClient.post<TokenResponse>(
      "/api/v1/auth/register",
      credentials
    );
    setAccessToken(response.data.access_token);
    return response.data;
  },

  async login(credentials: AuthCredentials): Promise<TokenResponse> {
    const response = await apiClient.post<TokenResponse>(
      "/api/v1/auth/login",
      credentials
    );
    setAccessToken(response.data.access_token);
    return response.data;
  },

  async refreshToken(): Promise<TokenResponse> {
    const response = await apiClient.post<TokenResponse>(
      "/api/v1/auth/refresh"
    );
    setAccessToken(response.data.access_token);
    return response.data;
  },

  async logout(): Promise<{ message: string }> {
    const response = await apiClient.post<{ message: string }>(
      "/api/v1/auth/logout"
    );
    setAccessToken(null);
    return response.data;
  },

  async getMe(): Promise<User> {
    const response = await apiClient.get<User>("/api/v1/auth/me");
    return response.data;
  },
};
