import { apiClient } from "@/shared/api/client";
import type { Excuse, ExcuseCategory, ExcuseListResponse } from "@/entities/excuse/types";

export const excusesApi = {
  async getRandomExcuse(category?: ExcuseCategory): Promise<Excuse> {
    const params = category ? { category } : {};
    const response = await apiClient.get<Excuse>("/api/v1/excuses/random", {
      params,
    });
    return response.data;
  },

  async listExcuses(
    category?: ExcuseCategory,
    page = 1,
    pageSize = 50
  ): Promise<ExcuseListResponse> {
    const params: Record<string, any> = { page, page_size: pageSize };
    if (category) {
      params.category = category;
    }
    const response = await apiClient.get<ExcuseListResponse>("/api/v1/excuses", {
      params,
    });
    return response.data;
  },

  async createExcuse(text: string): Promise<Excuse> {
    const response = await apiClient.post<Excuse>("/api/v1/excuses", {
      text,
      category: "custom",
    });
    return response.data;
  },

  async deleteExcuse(id: string): Promise<{ message: string }> {
    const response = await apiClient.delete<{ message: string }>(
      `/api/v1/excuses/${id}`
    );
    return response.data;
  },
};
