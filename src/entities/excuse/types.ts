export type ExcuseCategory =
  | "rude"
  | "polite"
  | "technical"
  | "absurd"
  | "custom";

export interface Excuse {
  id: string;
  text: string;
  category: ExcuseCategory;
  is_system: boolean;
  user_id?: string | null;
  created_at: string;
  updated_at: string;
}

export interface ExcuseListResponse {
  items: Excuse[];
  total: number;
  page: number;
  page_size: number;
}
