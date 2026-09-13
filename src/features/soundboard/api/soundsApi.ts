import { apiClient } from "@/shared/api/client";
import type { CustomSound, SoundCategory, SoundListResponse } from "@/entities/sound/types";

export interface UploadSoundPayload {
  file: File;
  title: string;
  category: SoundCategory;
  estimatedDuration?: number;
}

export const soundsApi = {
  async listSounds(category?: SoundCategory, page = 1, pageSize = 50): Promise<SoundListResponse> {
    const params: Record<string, unknown> = { page, page_size: pageSize };
    if (category) {
      params.category = category;
    }
    const response = await apiClient.get<SoundListResponse>("/api/v1/sounds", { params });
    return response.data;
  },

  async uploadSound(payload: UploadSoundPayload): Promise<CustomSound> {
    const formData = new FormData();
    formData.append("file", payload.file);
    formData.append("title", payload.title);
    formData.append("category", payload.category);
    if (payload.estimatedDuration) {
      formData.append("estimated_duration", payload.estimatedDuration.toString());
    }

    const response = await apiClient.post<CustomSound>("/api/v1/sounds/upload", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
    return response.data;
  },

  async deleteSound(soundId: string): Promise<CustomSound> {
    const response = await apiClient.delete<CustomSound>(`/api/v1/sounds/${soundId}`);
    return response.data;
  },
};
