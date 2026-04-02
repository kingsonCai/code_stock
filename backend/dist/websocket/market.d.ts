/**
 * 行情数据模拟器
 * 用于测试和开发环境
 */
import { WebSocketServer } from './index.js';
import { KlineData } from './types.js';
export declare class MarketSimulator {
    private wsServer;
    private intervals;
    private prices;
    private accountBroadcastInterval;
    constructor(wsServer: WebSocketServer);
    /**
     * 启动模拟器
     */
    start(): void;
    /**
     * 停止模拟器
     */
    stop(): void;
    /**
     * 启动单个股票的价格更新
     */
    private startPriceUpdates;
    /**
     * 获取股票名称
     */
    private getStockName;
    /**
     * 生成新价格（随机游走）
     */
    private generateNewPrice;
    /**
     * 获取当前价格
     */
    getPrice(symbol: string): number | undefined;
    /**
     * 获取所有价格
     */
    getAllPrices(): Map<string, number>;
    /**
     * 获取美股列表
     */
    static getUSStocks(): {
        symbol: string;
        basePrice: number;
        name: string;
    }[];
    /**
     * 获取A股列表
     */
    static getCNStocks(): {
        symbol: string;
        basePrice: number;
        name: string;
    }[];
    /**
     * 生成历史K线数据
     */
    generateKlineData(symbol: string, timeframe: string, count?: number): KlineData[];
}
//# sourceMappingURL=market.d.ts.map