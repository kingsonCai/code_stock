/**
 * 跨交易所价差监控服务
 * 对比 OKX 和 Gate 相同品种的价格差异
 */
import { WebSocketServer } from './index.js';
import { okxMarket } from './server.js';
import { gateMarket } from './server.js';
import { logger } from '../config/logger.js';
import { TRADING_PAIRS as OKX_PAIRS } from './okx.js';

// 价差数据
export interface SpreadData {
  symbol: string;           // 统一符号 (如 BTC)
  okxSymbol: string;        // OKX 交易对 (BTC-USDT)
  gateSymbol: string;       // Gate 交易对 (BTC_USDT)
  okxPrice: number | null;  // OKX 价格，无数据时为 null
  gatePrice: number | null; // Gate 价格，无数据时为 null
  spread: number | null;    // 绝对价差，数据不完整时为 null
  spreadPercent: number | null; // 价差百分比，数据不完整时为 null
  premium: 'OKX' | 'Gate' | 'None' | '--' | null;  // 哪个交易所价格更高
  timestamp: number;
}

// 价差监控配置
interface SpreadMonitorConfig {
  updateInterval: number;   // 更新间隔（毫秒）
}

export class SpreadMonitor {
  private wsServer: WebSocketServer;
  private updateInterval: NodeJS.Timeout | null = null;
  private spreads: Map<string, SpreadData> = new Map();
  private config: SpreadMonitorConfig;
  private initialized = false;

  constructor(wsServer: WebSocketServer, config?: Partial<SpreadMonitorConfig>) {
    this.wsServer = wsServer;
    this.config = {
      updateInterval: 3000,
      ...config,
    };
  }

  /**
   * 启动价差监控
   */
  async start(): Promise<void> {
    logger.info('Spread monitor starting...');

    // 首次计算
    this.calculateSpreads();

    // 定时更新
    this.updateInterval = setInterval(() => {
      this.calculateSpreads();
    }, this.config.updateInterval);
  }

  /**
   * 停止价差监控
   */
  stop(): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
    logger.info('Spread monitor stopped');
  }

  /**
   * 计算所有交易对的价差
   */
  private calculateSpreads(): void {
    if (!okxMarket || !gateMarket) {
      if (!this.initialized) {
        logger.warn('Spread monitor waiting for OKX and Gate markets to initialize...');
      }
      return;
    }

    const okxPrices = okxMarket.getAllPrices();
    const gatePrices = gateMarket.getAllPrices();
    const spreadsArray: SpreadData[] = [];

    for (const pair of OKX_PAIRS) {
      const okxPrice = okxPrices.get(pair.symbol) ?? null;
      const gatePrice = gatePrices.get(pair.gateSymbol) ?? null;

      const hasBoth = okxPrice !== null && gatePrice !== null;

      let spread: number | null = null;
      let spreadPercent: number | null = null;
      let premium: SpreadData['premium'] = null;

      if (hasBoth) {
        spread = okxPrice! - gatePrice!;
        const avgPrice = (okxPrice! + gatePrice!) / 2;
        spreadPercent = avgPrice > 0 ? (spread / avgPrice) * 100 : 0;
        premium = spread > 0 ? 'OKX' : spread < 0 ? 'Gate' : 'None';
      } else {
        premium = '--';
      }

      const spreadData: SpreadData = {
        symbol: pair.symbol.replace('-USDT', ''),
        okxSymbol: pair.symbol,
        gateSymbol: pair.gateSymbol,
        okxPrice,
        gatePrice,
        spread,
        spreadPercent,
        premium,
        timestamp: Date.now(),
      };

      this.spreads.set(pair.symbol, spreadData);
      spreadsArray.push(spreadData);
    }

    // 有数据的排前面，无数据的排后面，按 |价差百分比| 降序
    spreadsArray.sort((a, b) => {
      if (a.spreadPercent === null && b.spreadPercent === null) return 0;
      if (a.spreadPercent === null) return 1;
      if (b.spreadPercent === null) return -1;
      return Math.abs(b.spreadPercent) - Math.abs(a.spreadPercent);
    });

    // 广播价差数据
    this.wsServer.broadcast('market:spread', {
      spreads: spreadsArray,
      timestamp: Date.now(),
    });

    if (!this.initialized) {
      this.initialized = true;
      logger.info(`Spread monitor initialized with ${spreadsArray.length} pairs`);
    }
  }

  /**
   * 获取当前价差数据
   */
  getSpreads(): SpreadData[] {
    return Array.from(this.spreads.values())
      .sort((a, b) => {
        if (a.spreadPercent === null && b.spreadPercent === null) return 0;
        if (a.spreadPercent === null) return 1;
        if (b.spreadPercent === null) return -1;
        return Math.abs(b.spreadPercent) - Math.abs(a.spreadPercent);
      });
  }

  /**
   * 获取单个交易对的价差
   */
  getSpread(symbol: string): SpreadData | undefined {
    return this.spreads.get(symbol);
  }
}
