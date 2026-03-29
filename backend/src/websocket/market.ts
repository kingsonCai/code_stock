/**
 * 行情数据模拟器
 * 用于测试和开发环境
 */
import { WebSocketServer } from './index.js';
import { MarketData, KlineData } from './types.js';
import { logger } from '../config/logger.js';
import { portfolioService } from '../services/portfolio.js';

// 美股/期货数据
const US_STOCKS = [
  { symbol: 'AAPL', basePrice: 215.0, name: 'Apple Inc.' },
  { symbol: 'GOOGL', basePrice: 168.0, name: 'Alphabet Inc.' },
  { symbol: 'MSFT', basePrice: 415.0, name: 'Microsoft Corp.' },
  { symbol: 'NVDA', basePrice: 880.0, name: 'NVIDIA Corp.' },
  { symbol: 'TSLA', basePrice: 250.0, name: 'Tesla Inc.' },
  { symbol: 'GC=F', basePrice: 2350.0, name: '黄金期货' },
  { symbol: 'SI=F', basePrice: 28.0, name: '白银期货' },
  { symbol: 'CL=F', basePrice: 78.0, name: '原油期货' },
];

// A股数据
const CN_STOCKS = [
  { symbol: '600519', basePrice: 1445.0, name: '贵州茅台' },
  { symbol: '000858', basePrice: 165.0, name: '五粮液' },
  { symbol: '601318', basePrice: 42.0, name: '中国平安' },
  { symbol: '000333', basePrice: 58.0, name: '美的集团' },
  { symbol: '600036', basePrice: 32.0, name: '招商银行' },
  { symbol: '601012', basePrice: 6.5, name: '隆基绿能' },
  { symbol: '000651', basePrice: 42.0, name: '格力电器' },
  { symbol: '002594', basePrice: 85.0, name: '比亚迪' },
];

// 所有股票（合并）
const ALL_STOCKS = [...US_STOCKS, ...CN_STOCKS];

export class MarketSimulator {
  private wsServer: WebSocketServer;
  private intervals: Map<string, NodeJS.Timeout> = new Map();
  private prices: Map<string, number> = new Map();
  private accountBroadcastInterval: NodeJS.Timeout | null = null;

  constructor(wsServer: WebSocketServer) {
    this.wsServer = wsServer;

    // 初始化所有股票价格
    ALL_STOCKS.forEach((stock) => {
      this.prices.set(stock.symbol, stock.basePrice);
    });
  }

  /**
   * 启动模拟器
   */
  start(): void {
    logger.info('Market simulator started');

    // 为每个股票启动价格更新
    ALL_STOCKS.forEach((stock) => {
      this.startPriceUpdates(stock.symbol);
    });

    // 启动账户更新广播（每5秒推送一次账户/持仓更新）
    this.accountBroadcastInterval = setInterval(() => {
      const prices = new Map(this.prices);
      portfolioService.updateFromMarketData(prices);
    }, 5000);
  }

  /**
   * 停止模拟器
   */
  stop(): void {
    this.intervals.forEach((interval, symbol) => {
      clearInterval(interval);
      logger.debug(`Stopped price updates for ${symbol}`);
    });
    this.intervals.clear();
    if (this.accountBroadcastInterval) {
      clearInterval(this.accountBroadcastInterval);
      this.accountBroadcastInterval = null;
    }
    logger.info('Market simulator stopped');
  }

  /**
   * 启动单个股票的价格更新
   */
  private startPriceUpdates(symbol: string): void {
    // 避免重复启动
    if (this.intervals.has(symbol)) {
      return;
    }

    const interval = setInterval(() => {
      const currentPrice = this.prices.get(symbol) || 100;
      const newPrice = this.generateNewPrice(currentPrice);
      this.prices.set(symbol, newPrice);

      const marketData: MarketData = {
        symbol,
        price: newPrice,
        change: newPrice - currentPrice,
        changePercent: ((newPrice - currentPrice) / currentPrice) * 100,
        volume: Math.floor(Math.random() * 1000000),
        high: Math.max(currentPrice, newPrice) * (1 + Math.random() * 0.001),
        low: Math.min(currentPrice, newPrice) * (1 - Math.random() * 0.001),
        open: currentPrice,
        timestamp: Date.now(),
      };

      // 广播到对应市场频道
      this.wsServer.broadcast(`market:${symbol}`, marketData);

      // 同时广播到市场汇总频道
      const isCN = symbol.match(/^(6|0|3)\d{5}$/); // A股代码格式
      const channel = isCN ? 'market:cn' : 'market:us';
      this.wsServer.broadcast(channel, { ...marketData, name: this.getStockName(symbol) });
    }, 1000 + Math.random() * 2000); // 1-3秒随机间隔

    this.intervals.set(symbol, interval);
  }

  /**
   * 获取股票名称
   */
  private getStockName(symbol: string): string {
    const stock = ALL_STOCKS.find(s => s.symbol === symbol);
    return stock?.name || symbol;
  }

  /**
   * 生成新价格（随机游走）
   */
  private generateNewPrice(currentPrice: number): number {
    const volatility = 0.001; // 0.1% 波动
    const change = currentPrice * volatility * (Math.random() - 0.5) * 2;
    return Number((currentPrice + change).toFixed(2));
  }

  /**
   * 获取当前价格
   */
  getPrice(symbol: string): number | undefined {
    return this.prices.get(symbol);
  }

  /**
   * 获取所有价格
   */
  getAllPrices(): Map<string, number> {
    return new Map(this.prices);
  }

  /**
   * 获取美股列表
   */
  static getUSStocks() {
    return US_STOCKS;
  }

  /**
   * 获取A股列表
   */
  static getCNStocks() {
    return CN_STOCKS;
  }

  /**
   * 生成历史K线数据
   */
  generateKlineData(
    symbol: string,
    timeframe: string,
    count: number = 100
  ): KlineData[] {
    const basePrice = this.prices.get(symbol) || 100;
    const now = Date.now();
    const timeframeMs: Record<string, number> = {
      '1m': 60000,
      '5m': 300000,
      '15m': 900000,
      '1h': 3600000,
      '4h': 14400000,
      '1d': 86400000,
    };

    const interval = timeframeMs[timeframe] || 86400000;
    const klines: KlineData[] = [];
    let price = basePrice * (1 - Math.random() * 0.2); // 从较低价格开始

    for (let i = 0; i < count; i++) {
      const time = now - (count - i) * interval;
      const open = price;
      const change = price * 0.02 * (Math.random() - 0.5);
      const close = price + change;
      const high = Math.max(open, close) * (1 + Math.random() * 0.01);
      const low = Math.min(open, close) * (1 - Math.random() * 0.01);
      const volume = Math.floor(Math.random() * 10000000);

      klines.push({
        symbol,
        timeframe,
        time: Math.floor(time / 1000),
        open: Number(open.toFixed(2)),
        high: Number(high.toFixed(2)),
        low: Number(low.toFixed(2)),
        close: Number(close.toFixed(2)),
        volume,
      });

      price = close;
    }

    return klines;
  }
}
