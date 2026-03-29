/**
 * WebSocket 消息类型定义
 */

// 客户端 -> 服务端消息
export interface ClientMessage {
  type: 'subscribe' | 'unsubscribe' | 'ping';
  channel: string;
  data?: unknown;
}

// 服务端 -> 客户端消息
export interface ServerMessage<T = unknown> {
  type: 'data' | 'error' | 'pong' | 'connected' | 'subscribed' | 'unsubscribed';
  channel: string;
  data?: T;
  error?: string;
  timestamp: number;
}

// 频道类型
export type ChannelType = 'market' | 'backtest' | 'strategy' | 'system';

// 行情数据
export interface MarketData {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  high: number;
  low: number;
  open: number;
  timestamp: number;
}

// K线数据
export interface KlineData {
  symbol: string;
  timeframe: string;
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

// 回测状态
export interface BacktestStatus {
  backtestId: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  progress: number;
  message?: string;
  result?: unknown;
}

// 策略状态
export interface StrategyStatus {
  strategyId: string;
  status: 'running' | 'paused' | 'stopped';
  positions: unknown[];
  pnl: number;
}
