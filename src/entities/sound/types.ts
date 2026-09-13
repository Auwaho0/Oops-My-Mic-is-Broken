export type SoundCategory = "renovation" | "family" | "tech" | "other";

export interface CustomSound {
  id: string;
  title: string;
  category: SoundCategory;
  file_url: string;
  mime_type: string;
  file_size: number;
  duration_sec: number;
  is_system: boolean;
  is_nsfw: boolean;
  user_id?: string;
  created_at: string;
}

export interface SoundListResponse {
  items: CustomSound[];
  total: number;
  page: number;
  page_size: number;
}
