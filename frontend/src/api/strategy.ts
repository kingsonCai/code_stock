import { api, PaginatedResponse } from './client';

export type StrategyStatus = 'draft' | 'published' | 'archived';

export interface StrategyConfig {
  symbols?: string[];
  timeframe?: string;
  startDate?: string;
  endDate?: string;
  initialCapital?: number;
  commission?: number;
  [key: string]: unknown;
}

export interface Strategy {
  id: string;
  userId: string;
  name: string;
  description?: string;
  code: string;
  status: StrategyStatus;
  isPublic: boolean;
  config: StrategyConfig;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateStrategyInput {
  name: string;
  description?: string;
  code: string;
  status?: StrategyStatus;
  isPublic?: boolean;
  config?: StrategyConfig;
}

export interface UpdateStrategyInput {
  name?: string;
  description?: string;
  code?: string;
  status?: StrategyStatus;
  isPublic?: boolean;
  config?: StrategyConfig;
}

export interface StrategyQueryParams {
  page?: number;
  pageSize?: number;
  status?: StrategyStatus;
}

export const strategyApi = {
  /**
   * 获取策略列表
   */
  getList: (params?: StrategyQueryParams) =>
    api.get<PaginatedResponse<Strategy>>('/strategies', params as Record<string, unknown>),

  /**
   * 获取公开策略列表
   */
  getPublicList: (params?: { page?: number; pageSize?: number }) =>
    api.get<PaginatedResponse<Strategy>>('/strategies/public', params as Record<string, unknown>),

  /**
   * 获取策略详情
   */
  getById: (id: string) =>
    api.get<Strategy>(`/strategies/${id}`),

  /**
   * 创建策略
   */
  create: (data: CreateStrategyInput) =>
    api.post<Strategy>('/strategies', data),

  /**
   * 更新策略
   */
  update: (id: string, data: UpdateStrategyInput) =>
    api.put<Strategy>(`/strategies/${id}`, data),

  /**
   * 删除策略
   */
  delete: (id: string) =>
    api.delete<void>(`/strategies/${id}`),

  /**
   * 复制策略
   */
  duplicate: (id: string) =>
    api.post<Strategy>(`/strategies/${id}/duplicate`),

  /**
   * 发布策略
   */
  publish: (id: string) =>
    api.post<Strategy>(`/strategies/${id}/publish`),

  /**
   * 归档策略
   */
  archive: (id: string) =>
    api.post<Strategy>(`/strategies/${id}/archive`),
};
