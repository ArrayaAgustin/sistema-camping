import { request } from './apiClient';

export interface LoginResponse {
  success: boolean;
  message?: string;
  token: string;
  user: {
    id: number;
    username: string;
    email: string | null;
    afiliado_id?: number | null;
    persona_id?: number | null;
    roles: string[];
    permisos: string[];
    activo?: boolean;
    must_change_password?: boolean;
  };
}

export interface UserProfileResponse {
  success: boolean;
  data: LoginResponse['user'] & {
    must_change_password?: boolean;
    ultimo_acceso?: string | null;
    created_at?: string | null;
    updated_at?: string | null;
    afiliado?: any;
    persona_id?: number | null;
  };
  timestamp?: string;
  message?: string;
}

export const authService = {
  login: (username: string, password: string) =>
    request<LoginResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password })
    }),

  getProfile: () => request<UserProfileResponse>('/auth/profile'),

  changePassword: (currentPassword: string, newPassword: string) =>
    request('/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({ currentPassword, newPassword })
    }),

  logout: () => request('/auth/logout', { method: 'POST' })
};

export default authService;
