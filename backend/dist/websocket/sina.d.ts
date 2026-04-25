/**
 * 新浪财经实时行情数据源
 * 国内可直接访问，免费无需 API Key
 */
import { WebSocketServer } from './index.js';
export declare class SinaFinanceMarket {
    private wsServer;
    private fetchInterval;
    private prices;
    private initialized;
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
     * 获取所有股票报价
     */
    private fetchAllQuotes;
    /**
     * 解析新浪行情响应
     * 格式: var hq_str_gb_aapl="苹果,215.32,0.45,0.21,..."
     */
    private parseSinaResponse;
    /**
     * 获取当前价格
     */
    getPrice(symbol: string): number | undefined;
    /**
     * 获取所有价格
     */
    getAllPrices(): Map<string, number>;
}
//# sourceMappingURL=sina.d.ts.map