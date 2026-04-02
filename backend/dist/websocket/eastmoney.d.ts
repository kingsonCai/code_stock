/**
 * 东方财富实时行情数据源
 * 免费、国内可直接访问
 */
import { WebSocketServer } from './index.js';
export declare class EastMoneyMarket {
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
     * 处理报价数据
  
     */
    private processQuote;
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
}
//# sourceMappingURL=eastmoney.d.ts.map