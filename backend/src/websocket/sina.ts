/**
 * 新浪财经实时行情数据源
 * 国内可直接访问，免费无需 API Key
 */
import { WebSocketServer } from './index.js';
import { MarketData } from './types.js';
import { logger } from '../config/logger.js';
import { portfolioService } from '../services/portfolio.js';

// 支持的股票/商品代码（新浪格式）
const SYMBOLS = [
  { symbol: 'AAPL', sinaCode: 'gb_aapl', name: 'Apple Inc.' },
  { symbol: 'GOOGL', sinaCode: 'gb_googl', name: 'Alphabet Inc.' },
  { symbol: 'MSFT', sinaCode: 'gb_msft', name: 'Microsoft Corp.' },
  { symbol: 'NVDA', sinaCode: 'gb_nvda', name: 'NVIDIA Corp.' },
  { symbol: 'TSLA', sinaCode: 'gb_tsla', name: 'Tesla Inc.' },
  // 期货使用新浪期货代码
  { symbol: 'GC=F', sinaCode: 'nfxa0', name: 'Gold Futures' },  // 纽约金
  { symbol: 'SI=F', sinaCode: 'nfxag0', name: 'Silver Futures' }, // 纽约银
  { symbol: 'CL=F', sinaCode: 'nfcl0', name: 'Crude Oil Futures' }, // 原油
];

// 新浪行情响应格式
interface SinaQuote {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  open: number;
  high: number;
  low: number;
  volume: number;
  prevClose: number;
}

export class SinaFinanceMarket {
  private wsServer: WebSocketServer;
  private fetchInterval: NodeJS.Timeout | null = null;
  private prices: Map<string, { price: number; previousClose: number }> = new Map();
  private initialized = false;

  constructor(wsServer: WebSocketServer) {
    this.wsServer = wsServer;
  }

  /**
   * 启动实时数据获取
   */
  async start(): Promise<void> {
    logger.info('Sina Finance market data service starting...');

    // 初始化默认价格
    this.initializeDefaultPrices();

    // 首次获取真实价格
    await this.fetchAllQuotes();

    // 每 5 秒更新一次
    this.fetchInterval = setInterval(() => {
      this.fetchAllQuotes();
    }, 5000);
  }

  /**
   * 停止数据获取
   */
  stop(): void {
    if (this.fetchInterval) {
      clearInterval(this.fetchInterval);
      this.fetchInterval = null;
    }
    logger.info('Sina Finance market data service stopped');
  }

  /**
   * 获取所有股票报价
   */
  private async fetchAllQuotes(): Promise<void> {
    const codes = SYMBOLS.map((s) => s.sinaCode);
    const url = `https://hq.sinajs.cn/?list=${codes.join(',')}`;

    try {
      const response = await fetch(url, {
        headers: {
          'Referer': 'https://finance.sina.com.cn',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const text = await response.text();
      this.parseSinaResponse(text);

      if (!this.initialized) {
        this.initialized = true;
        logger.info('Sina Finance data initialized successfully');
      }
    } catch (error: any) {
      logger.warn(`Sina Finance fetch error: ${error.message}`);
      // 失败时使用模拟微小变化
      this.simulateSmallChanges();
    }
  }

  /**
   * 解析新浪行情响应
   * 格式: var hq_str_gb_aapl="苹果,215.32,0.45,0.21,..."
   */
  private parseSinaResponse(text: string): void {
    const lines = text.split('\n').filter((l) => l.trim());
    const marketPrices = new Map<string, number>();

    for (const line of lines) {
      const match = line.match(/var hq_str_(\w+)="(.*)"/);
      if (!match) continue;

      const [, code, data] = match;
      const symbolInfo = SYMBOLS.find((s) => s.sinaCode === code);
      if (!symbolInfo || !data) continue;

      // 美股格式: 名称,当前价格,涨跌额,涨跌幅,昨收,今开,最高,最低,成交量
      // 期货格式略有不同
      const parts = data.split(',');

      let price: number;
      let change: number;
      let changePercent: number;
      let open: number;
      let high: number;
      let low: number;
      let volume: number;
      let prevClose: number;

      if (code.startsWith('gb_')) {
        // 美股格式
        price = parseFloat(parts[1]) || 0;
        change = parseFloat(parts[2]) || 0;
        changePercent = parseFloat(parts[3]) || 0;
        prevClose = parseFloat(parts[4]) || price;
        open = parseFloat(parts[5]) || price;
        high = parseFloat(parts[6]) || price;
        low = parseFloat(parts[7]) || price;
        volume = parseFloat(parts[8]) || 0;
      } else {
        // 期货格式
        price = parseFloat(parts[0]) || 0;
        change = parseFloat(parts[1]) || 0;
        changePercent = parseFloat(parts[2]) || 0;
        prevClose = parseFloat(parts[3]) || price;
        open = parseFloat(parts[4]) || price;
        high = parseFloat(parts[5]) || price;
        low = parseFloat(parts[6]) || price;
        volume = parseFloat(parts[7]) || 0;
      }

      if (price > 0) {
        this.prices.set(symbolInfo.symbol, { price, previousClose: prevClose });
        marketPrices.set(symbolInfo.symbol, price);

        const marketData: MarketData = {
          symbol: symbolInfo.symbol,
          price,
          change,
          changePercent,
          volume,
          high,
          low,
          open,
          timestamp: Date.now(),
        };

        this.wsServer.broadcast(`market:${symbolInfo.symbol}`, marketData);
        logger.debug(`${symbolInfo.symbol}: $${price.toFixed(2)} (${changePercent >= 0 ? '+' : ''}${changePercent.toFixed(2)}%)`);
      }
    }

    if (marketPrices.size > 0) {
      portfolioService.updateFromMarketData(marketPrices);
    }
  }

  /**
   * 网络错误时模拟微小价格变化
   */
  private simulateSmallChanges(): void {
    const marketPrices = new Map<string, number>();

    this.prices.forEach((data, symbol) => {
      // 微小随机波动 (-0.05% ~ +0.05%)
      const change = data.price * 0.0005 * (Math.random() - 0.5) * 2;
      const newPrice = Math.max(0.01, data.price + change);

      this.prices.set(symbol, { ...data, price: newPrice });
      marketPrices.set(symbol, newPrice);

      const marketData: MarketData = {
        symbol,
        price: newPrice,
        change: change,
        changePercent: (change / data.price) * 100,
        volume: Math.floor(Math.random() * 1000000),
        high: newPrice * 1.001,
        low: newPrice * 0.999,
        open: data.previousClose || newPrice,
        timestamp: Date.now(),
      };

      this.wsServer.broadcast(`market:${symbol}`, marketData);
    });

    portfolioService.updateFromMarketData(marketPrices);
  }

  /**
   * 初始化默认价格
   */
  private initializeDefaultPrices(): void {
    const defaults: Record<string, number> = {
      'AAPL': 215.0,
      'GOOGL': 168.0,
      'MSFT': 415.0,
      'NVDA': 880.0,
      'TSLA': 250.0,
      'GC=F': 2350.0,
      'SI=F': 28.0,
      'CL=F': 78.0,
    };

    SYMBOLS.forEach(({ symbol }) => {
      const price = defaults[symbol] || 100;
      this.prices.set(symbol, { price, previousClose: price });
    });
  }

  /**
   * 获取当前价格
   */
  getPrice(symbol: string): number | undefined {
    return this.prices.get(symbol)?.price;
  }

  /**
   * 获取所有价格
   */
  getAllPrices(): Map<string, number> {
    const result = new Map<string, number>();
    this.prices.forEach((data, symbol) => {
      result.set(symbol, data.price);
    });
    return result;
  }
}
