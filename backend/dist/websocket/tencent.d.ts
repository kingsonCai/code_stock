/**
 * 腾讯财经实时行情数据源
 * 免费、国内可直接访问
 */
import { WebSocketServer } from './index.js';
export declare class TencentFinanceMarket {
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
     * 解析腾讯行情响应
     * 格式: v_sh600519="1~贵州茅台~600519~1445.00~1452.87~..."
     */
    private parseTencentResponse;
    /**
     * 获取当前价格
     */
    getPrice(symbol: string): number | undefined;
    /**
     * 获取所有价格
     */
    getAllPrices(): Map<string, number>;
}
//# sourceMappingURL=tencent.d.ts.map