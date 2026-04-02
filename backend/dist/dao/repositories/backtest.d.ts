/**
 * 回测实体定义
 */
import { BaseEntity } from '../types.js';
export type BacktestStatus = 'pending' | 'running' | 'completed' | 'failed';
export interface BacktestConfig {
    symbol: string;
    timeframe: string;
    startDate: string;
    endDate: string;
    initialCapital: number;
    commission: number;
    slippage?: number;
    [key: string]: unknown;
}
export interface BacktestMetrics {
    totalReturn: number;
    annualizedReturn: number;
    maxDrawdown: number;
    sharpeRatio: number;
    winRate: number;
    profitFactor: number;
    totalTrades: number;
    avgTradeDuration?: number;
}
export interface BacktestResult {
    metrics: BacktestMetrics;
    trades: BacktestTrade[];
    equityCurve: EquityPoint[];
}
export interface BacktestTrade {
    timestamp: Date;
    symbol: string;
    side: 'buy' | 'sell';
    quantity: number;
    price: number;
    commission: number;
    pnl?: number;
}
export interface EquityPoint {
    timestamp: Date;
    equity: number;
    drawdown?: number;
}
export interface Backtest extends BaseEntity {
    strategyId: string;
    userId: string;
    status: BacktestStatus;
    config: BacktestConfig;
    result?: BacktestResult;
    errorMessage?: string;
    startedAt?: Date;
    completedAt?: Date;
}
/**
 * 创建回测时的数据
 */
export type CreateBacktestData = Omit<Backtest, 'id' | 'createdAt' | 'updatedAt'>;
/**
 * 更新回测时的数据
 */
export type UpdateBacktestData = Partial<Pick<Backtest, 'status' | 'result' | 'errorMessage' | 'startedAt' | 'completedAt'>>;
//# sourceMappingURL=backtest.d.ts.map