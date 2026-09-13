export interface User {
  id: string;
  email: string;
  role: "user" | "moderator" | "admin";
  is_active: boolean;
  created_at: string;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

export interface ProblemDetail {
  type?: string;
  title: string;
  status: number;
  detail?: string;
  instance?: string;
  invalid_params?: Array<{ loc: string[]; msg: string; type: string }>;
}
