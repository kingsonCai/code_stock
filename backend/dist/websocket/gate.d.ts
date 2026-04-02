/**
 * Gate.io 交易所实时行情数据源
 * 使用 REST API 获取加密货币实时价格
 * API 文档: https://www.gate.com/docs/developers/apiv4/
 */
import { WebSocketServer } from './index.js';
export declare const TRADING_PAIRS: {
    symbol: string;
    name: string;
    okxSymbol: string;
}[];
export declare class GateMarket {
    private wsServer;
    private fetchInterval;
    private prices;
    private initialized;
    private readonly baseUrl;
    constructor(wsServer: WebSocketServer);
    /**
     * 启动实时数据获取
     */
    start(): Promise<void>;
    /**
     * 停止数据获取
     */
    stop(): void;
    /**
     * 获取所有交易对行情
     */
    private fetchAllTickers;
    /**
     * 处理行情数据
     */
    private processTickers;
    /**
     * 网络错误时模拟微小价格变化
     */
    private simulateSmallChanges;
    /**
     * 初始化默认价格
     */
    private initializeDefaultPrices;
    /**
     * 获取当前价格
     */
    getPrice(symbol: string): number | undefined;
    /**
     * 获取所有价格
     */
    getAllPrices(): Map<string, number>;
    /**
     * 获取支持的交易对列表
     */
    static getTradingPairs(): {
        symbol: string;
        name: string;
        okxSymbol: string;
    }[];
}
//# sourceMappingURL=gate.d.ts.map