/**
 * 行情数据类型定义
 */

// K线数据
export interface KlineData {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

// 分时数据
export interface TickData {
  time: number;
  price: number;
  volume: number;
}

// 行情快照
export interface QuoteData {
  symbol: string;
  price: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  change: number;
  changePercent: number;
  timestamp: number;
}

// 深度数据
export interface DepthLevel {
  price: number;
  quantity: number;
}

export interface DepthData {
  symbol: string;
  bids: DepthLevel[];
  asks: DepthLevel[];
  timestamp: number;
}

// 成交记录
export interface TradeRecord {
  id: string;
  symbol: string;
  price: number;
  quantity: number;
  side: 'buy' | 'sell';
  timestamp: number;
}

// 时间周期
export type TimeFrame = '1m' | '5m' | '15m' | '30m' | '1h' | '4h' | '1d' | '1w';
