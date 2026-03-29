import { api } from './client';

// 持仓数据
export interface Position {
  symbol: string;
  quantity: number;
  avgPrice: number;
  currentPrice: number;
  marketValue: number;
  pnl: number;
  pnlPercent: number;
  updatedAt: number;
}

// 账户信息
export interface AccountInfo {
  totalAssets: number;
  availableCash: number;
  marketValue: number;
  frozenCash: number;
  todayPnl: number;
  todayPnlPercent: number;
  updatedAt: number;
}

// 投资组合
export interface Portfolio {
  account: AccountInfo;
  positions: Position[];
  updatedAt: number;
}

// 交易记录
export interface TradeRecord {
  id: string;
  symbol: string;
  side: 'buy' | 'sell';
  quantity: number;
  price: number;
  filledPrice?: number;
  commission?: number;
  status: string;
  createdAt: string;
  updatedAt: string;
  executedAt?: string;
}

// 订阅响应
export interface SubscribeResponse {
  wsPath: string;
  channels: string[];
}

export const portfolioApi = {
  /**
   * 获取投资组合
   */
  getPortfolio: () => api.get<Portfolio>('/portfolio'),

  /**
   * 获取最近交易记录
   */
  getRecentTrades: (limit: number = 10) =>
    api.get<TradeRecord[]>('/portfolio/trades', { limit } as Record<string, unknown>),

  /**
   * 获取当前价格
   */
  getPrices: () =>
    api.get<Array<{
      symbol: string;
      currentPrice: number;
      avgPrice: number;
      pnl: number;
      pnlPercent: number;
    }>>('/portfolio/prices'),

  /**
   * 获取 WebSocket 订阅信息
   */
  subscribe: () => api.post<SubscribeResponse>('/portfolio/subscribe'),
};
