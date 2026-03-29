import axios, { AxiosInstance, AxiosError, InternalAxiosRequestConfig } from 'axios';
import { useUserStore } from '../stores/user';

// API 响应类型
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  error?: {
    status: number;
    message: string;
    details?: unknown;
  };
}

// 分页响应
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// 创建 axios 实例
const client: AxiosInstance = axios.create({
  baseURL: '/api',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 请求拦截器
client.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const userStore = useUserStore();

    if (userStore.token) {
      config.headers.Authorization = `Bearer ${userStore.token}`;
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// 响应拦截器
client.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error: AxiosError<ApiResponse<unknown>>) => {
    const userStore = useUserStore();

    if (error.response?.status === 401) {
      // Token 过期，尝试刷新
      if (userStore.refreshToken) {
        try {
          await userStore.refreshAuthToken();
          // 重试原请求
          const config = error.config;
          if (config) {
            config.headers.Authorization = `Bearer ${userStore.token}`;
            return client.request(config);
          }
        } catch {
          // 刷新失败，登出
          userStore.logout();
          window.location.href = '/login';
        }
      } else {
        userStore.logout();
        window.location.href = '/login';
      }
    }

    return Promise.reject(error);
  }
);

export default client;

// 便捷方法
export const api = {
  get: <T>(url: string, params?: Record<string, unknown>) =>
    client.get<ApiResponse<T>>(url, { params }).then((r) => r.data),

  post: <T>(url: string, data?: unknown) =>
    client.post<ApiResponse<T>>(url, data).then((r) => r.data),

  put: <T>(url: string, data?: unknown) =>
    client.put<ApiResponse<T>>(url, data).then((r) => r.data),

  delete: <T>(url: string) =>
    client.delete<ApiResponse<T>>(url).then((r) => r.data),
};
