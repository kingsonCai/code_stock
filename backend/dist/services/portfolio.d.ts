import { Trade } from '../dao/repositories/trade.js';
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
export interface AccountInfo {
    totalAssets: number;
    availableCash: number;
    marketValue: number;
    frozenCash: number;
    todayPnl: number;
    todayPnlPercent: number;
    updatedAt: number;
}
export interface PortfolioData {
    account: AccountInfo;
    positions: Position[];
    updatedAt: number;
}
interface PositionSnapshot {
    symbol: string;
    quantity: number;
    avgPrice: number;
}
declare class PortfolioService {
    /**
     * 初始化用户持仓数据
     */
    initUserPortfolio(userId: string, positions: PositionSnapshot[]): void;
    /**
     * 获取用户投资组合
     */
    getPortfolio(userId: string): PortfolioData;
    /**
     * 获取默认投资组合（未初始化时）
     */
    private getDefaultPortfolio;
    /**
     * 更新持仓价格
     */
    updatePositionPrice(symbol: string, newPrice: number): void;
    /**
     * 根据市场数据更新所有用户的持仓
     */
    updateFromMarketData(marketPrices: Map<string, number>): void;
    /**
     * 获取默认持仓快照
     */
    private getDefaultPositionSnapshots;
    /**
     * 广播账户更新
     */
    private broadcastAccountUpdate;
    /**
     * 获取最近交易记录
     */
    getRecentTrades(userId: string, limit?: number): Trade[];
    /**
     * 获取默认交易记录
     */
    private getDefaultTrades;
    /**
     * 添加交易记录
     */
    addTrade(userId: string, trade: Trade): void;
}
export declare const portfolioService: PortfolioService;
export {};
//# sourceMappingURL=portfolio.d.ts.map