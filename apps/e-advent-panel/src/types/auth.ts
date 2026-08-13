export interface AuthState {
  token: string | null;
  username: string | null;
  expiresAt: string | null;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  expiresAt: string;
  username: string;
}
