/**
 * 跨交易所价差监控服务
 * 对比 OKX 和 Gate 相同品种的价格差异
 */
import { WebSocketServer } from './index.js';
export interface SpreadData {
    symbol: string;
    okxSymbol: string;
    gateSymbol: string;
    okxPrice: number | null;
    gatePrice: number | null;
    spread: number | null;
    spreadPercent: number | null;
    premium: 'OKX' | 'Gate' | 'None' | null;
    timestamp: number;
}
interface SpreadMonitorConfig {
    updateInterval: number;
}
export declare class SpreadMonitor {
    private wsServer;
    private updateInterval;
    private spreads;
    private config;
    private initialized;
    constructor(wsServer: WebSocketServer, config?: Partial<SpreadMonitorConfig>);
    /**
     * 启动价差监控
     */
    start(): Promise<void>;
    /**
     * 停止价差监控
     */
    stop(): void;
    /**
     * 计算所有交易对的价差
     */
    private calculateSpreads;
    /**
     * 获取当前价差数据
     */
    getSpreads(): SpreadData[];
    /**
     * 获取单个交易对的价差
     */
    getSpread(symbol: string): SpreadData | undefined;
}
export {};
//# sourceMappingURL=spread-monitor.d.ts.map