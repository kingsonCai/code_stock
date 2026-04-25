/**
 * OKX 交易所实时行情数据源
 * 使用 REST API 获取加密货币实时价格
 * API 文档: https://www.okx.com/docs-v5/
 */
import { WebSocketServer } from './index.js';
export declare const TRADING_PAIRS: {
    symbol: string;
    name: string;
    gateSymbol: string;
}[];
export declare class OkxMarket {
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
        gateSymbol: string;
    }[];
}
//# sourceMappingURL=okx.d.ts.map