/**
 * Yahoo Finance 实时行情数据源
 * 使用 yahoo-finance2 库
 */
import YahooFinance from 'yahoo-finance2';
import { WebSocketServer } from './index.js';
import { MarketData } from './types.js';
import { logger } from '../config/logger.js';
import { portfolioService } from '../services/portfolio.js';

// 实例化 YahooFinance
const yahooFinance = new YahooFinance();

// 支持的股票/商品代码
const SYMBOLS = [
  { symbol: 'AAPL', name: 'Apple Inc.' },
  { symbol: 'GOOGL', name: 'Alphabet Inc.' },
  { symbol: 'MSFT', name: 'Microsoft Corp.' },
  { symbol: 'NVDA', name: 'NVIDIA Corp.' },
  { symbol: 'TSLA', name: 'Tesla Inc.' },
  { symbol: 'GC=F', name: 'Gold Futures' },
  { symbol: 'SI=F', name: 'Silver Futures' },
  { symbol: 'CL=F', name: 'Crude Oil Futures' },
];

// 报价类型定义
interface QuoteResult {
  symbol: string;
  regularMarketPrice?: number;
  regularMarketChange?: number;
  regularMarketChangePercent?: number;
  regularMarketVolume?: number;
  regularMarketDayHigh?: number;
  regularMarketDayLow?: number;
  regularMarketOpen?: number;
  regularMarketPreviousClose?: number;
}

export class YahooFinanceMarket {
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
    logger.info('Yahoo Finance market data service starting...');

    // 首次获取真实价格
    await this.fetchAllQuotes();

    // 每 10 秒更新一次
    this.fetchInterval = setInterval(() => {
      this.fetchAllQuotes();
    }, 10000);
  }

  /**
   * 停止数据获取
   */
  stop(): void {
    if (this.fetchInterval) {
      clearInterval(this.fetchInterval);
      this.fetchInterval = null;
    }
    logger.info('Yahoo Finance market data service stopped');
  }

  /**
   * 获取所有股票报价
   */
  private async fetchAllQuotes(): Promise<void> {
    let successCount = 0;

    for (const { symbol } of SYMBOLS) {
      try {
        // 逐个获取报价
        const quote = await yahooFinance.quote(symbol);
        // quote 是单个对象，直接使用
        if (quote && (quote as any).regularMarketPrice) {
          console.log('symbol:', symbol, 'quote.regularMarketPrice:', JSON.stringify(quote.regularMarketPrice))
          this.processQuote({
            symbol,
            regularMarketPrice: (quote as any).regularMarketPrice,
            regularMarketChange: (quote as any).regularMarketChange,
            regularMarketChangePercent: (quote as any).regularMarketChangePercent,
            regularMarketVolume: (quote as any).regularMarketVolume,
            regularMarketDayHigh: (quote as any).regularMarketDayHigh,
            regularMarketDayLow: (quote as any).regularMarketDayLow,
            regularMarketOpen: (quote as any).regularMarketOpen,
            regularMarketPreviousClose: (quote as any).regularMarketPreviousClose,
          });
          successCount++;
        }

        // 短暂延迟避免频率限制
        await new Promise((r) => setTimeout(r, 100));
      } catch (error: any) {
        logger.debug(`Failed to fetch ${symbol}: ${error.message}`);
      }
    }

    if (successCount > 0) {
      // 更新持仓
      const marketPrices = new Map<string, number>();
      this.prices.forEach((data, symbol) => {
        marketPrices.set(symbol, data.price);
      });
      portfolioService.updateFromMarketData(marketPrices);

      if (!this.initialized) {
        this.initialized = true;
        logger.info(`Yahoo Finance initialized with ${successCount}/${SYMBOLS.length} symbols`);
      }
    }
  }

  /**
   * 处理单个报价
   */
  private processQuote(quote: QuoteResult): void {
    const symbol = quote.symbol;
    const newPrice = quote.regularMarketPrice;

    if (!symbol || !newPrice) return;

    const previousClose = quote.regularMarketPreviousClose || newPrice;
    this.prices.set(symbol, { price: newPrice, previousClose });

    const marketData: MarketData = {
      symbol,
      price: newPrice,
      change: quote.regularMarketChange || 0,
      changePercent: quote.regularMarketChangePercent || 0,
      volume: quote.regularMarketVolume || 0,
      high: quote.regularMarketDayHigh || newPrice,
      low: quote.regularMarketDayLow || newPrice,
      open: quote.regularMarketOpen || newPrice,
      timestamp: Date.now(),
    };

    this.wsServer.broadcast(`market:${symbol}`, marketData);
    logger.debug(`${symbol}: $${newPrice.toFixed(2)} (${(quote.regularMarketChangePercent || 0).toFixed(2)}%)`);
  }

  /**
   * 初始化默认价格
   */
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
