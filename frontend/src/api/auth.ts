import { api } from './client';

export interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  role: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface AuthResponse {
  user: User;
  token: string;
  refreshToken: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface RegisterInput {
  email: string;
  password: string;
  name: string;
}

export interface ChangePasswordInput {
  oldPassword: string;
  newPassword: string;
}

export const authApi = {
  /**
   * 用户登录
   */
  login: (data: LoginInput) =>
    api.post<AuthResponse>('/auth/login', data),

  /**
   * 用户注册
   */
  register: (data: RegisterInput) =>
    api.post<AuthResponse>('/auth/register', data),

  /**
   * 获取当前用户信息
   */
  me: () =>
    api.get<User>('/auth/me'),

  /**
   * 修改密码
   */
  changePassword: (data: ChangePasswordInput) =>
    api.put<void>('/auth/password', data),

  /**
   * 刷新 Token
   */
  refresh: () =>
    api.post<{ token: string; refreshToken: string }>('/auth/refresh'),

  /**
   * 登出
   */
  logout: () =>
    api.post<void>('/auth/logout'),
};
