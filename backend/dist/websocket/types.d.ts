/**
 * WebSocket 消息类型定义
 */
export interface ClientMessage {
    type: 'subscribe' | 'unsubscribe' | 'ping';
    channel: string;
    data?: unknown;
}
export interface ServerMessage<T = unknown> {
    type: 'data' | 'error' | 'pong' | 'connected' | 'subscribed' | 'unsubscribed';
    channel: string;
    data?: T;
    error?: string;
    timestamp: number;
}
export type ChannelType = 'market' | 'backtest' | 'strategy' | 'system';
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
export interface BacktestStatus {
    backtestId: string;
    status: 'pending' | 'running' | 'completed' | 'failed';
    progress: number;
    message?: string;
    result?: unknown;
}
export interface StrategyStatus {
    strategyId: string;
    status: 'running' | 'paused' | 'stopped';
    positions: unknown[];
    pnl: number;
}
//# sourceMappingURL=types.d.ts.map