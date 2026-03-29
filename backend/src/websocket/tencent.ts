/**
 * 腾讯财经实时行情数据源
 * 免费、国内可直接访问
 */
import { WebSocketServer } from './index.js';
import { MarketData } from './types.js';
import { logger } from '../config/logger.js';
import { portfolioService } from '../services/portfolio.js';

// A股股票代码（腾讯格式：sh/sz + 代码）
const CN_STOCKS = [
  { symbol: '600519', code: 'sh600519', name: '贵州茅台' },
  { symbol: '000858', code: 'sz000858', name: '五粮液' },
  { symbol: '601318', code: 'sh601318', name: '中国平安' },
  { symbol: '000333', code: 'sz000333', name: '美的集团' },
  { symbol: '600036', code: 'sh600036', name: '招商银行' },
  { symbol: '601012', code: 'sh601012', name: '隆基绿能' },
  { symbol: '000651', code: 'sz000651', name: '格力电器' },
  { symbol: '002594', code: 'sz002594', name: '比亚迪' },
];

// 美股代码（腾讯格式：us + 代码）
const US_STOCKS = [
  { symbol: 'AAPL', code: 'usAAPL', name: 'Apple Inc.' },
  { symbol: 'GOOGL', code: 'usGOOGL', name: 'Alphabet Inc.' },
  { symbol: 'MSFT', code: 'usMSFT', name: 'Microsoft Corp.' },
  { symbol: 'NVDA', code: 'usNVDA', name: 'NVIDIA Corp.' },
  { symbol: 'TSLA', code: 'usTSLA', name: 'Tesla Inc.' },
];

// 股票名称映射（避免 GBK 编码问题）
const STOCK_NAMES: Record<string, string> = {
  '600519': '贵州茅台',
  '000858': '五粮液',
  '601318': '中国平安',
  '000333': '美的集团',
  '600036': '招商银行',
  '601012': '隆基绿能',
  '000651': '格力电器',
  '002594': '比亚迪',
  'AAPL': 'Apple Inc.',
  'GOOGL': 'Alphabet Inc.',
  'MSFT': 'Microsoft Corp.',
  'NVDA': 'NVIDIA Corp.',
  'TSLA': 'Tesla Inc.',
};

const ALL_STOCKS = [...CN_STOCKS, ...US_STOCKS];

export class TencentFinanceMarket {
  private wsServer: WebSocketServer;
  private fetchInterval: NodeJS.Timeout | null = null;
  private prices: Map<string, { price: number; previousClose: number; name: string }> = new Map();
  private initialized = false;

  constructor(wsServer: WebSocketServer) {
    this.wsServer = wsServer;
  }

  /**
   * 启动实时数据获取
   */
  async start(): Promise<void> {
    logger.info('Tencent Finance market data service starting...');

    // 初始化默认价格
    this.initializeDefaultPrices();

    // 首次获取真实价格
    await this.fetchAllQuotes();

    // 每 3 秒更新一次
    this.fetchInterval = setInterval(() => {
      this.fetchAllQuotes();
    }, 3000);
  }

  /**
   * 停止数据获取
   */
  stop(): void {
    if (this.fetchInterval) {
      clearInterval(this.fetchInterval);
      this.fetchInterval = null;
    }
    logger.info('Tencent Finance market data service stopped');
  }

  /**
   * 获取所有股票报价
   */
  private async fetchAllQuotes(): Promise<void> {
    const codes = ALL_STOCKS.map((s) => s.code).join(',');
    const url = `https://web.sqt.gtimg.cn/q=${codes}`;

    try {
      const response = await fetch(url, {
        headers: {
          'Referer': 'https://gu.qq.com/',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const text = await response.text();
      this.parseTencentResponse(text);

      if (!this.initialized) {
        this.initialized = true;
        logger.info('Tencent Finance data initialized successfully');
      }
    } catch (error: any) {
      logger.warn(`Tencent Finance fetch error: ${error.message}`);
      this.simulateSmallChanges();
    }
  }

  /**
   * 解析腾讯行情响应
   * 格式: v_sh600519="1~贵州茅台~600519~1445.00~1452.87~..."
   */
  private parseTencentResponse(text: string): void {
    const lines = text.split('\n').filter((l) => l.trim());
    const marketPrices = new Map<string, number>();

    for (const line of lines) {
      const match = line.match(/v_(\w+)="(.*)"/);
      if (!match) continue;

      const [, , data] = match;
      const parts = data.split('~');

      if (parts.length < 10) continue;

      const code = parts[2];
      const price = parseFloat(parts[3]);
      const prevClose = parseFloat(parts[4]);
      const open = parseFloat(parts[5]);
      const volume = parseFloat(parts[6]) || 0;
      const high = parseFloat(parts[33]) || price;
      const low = parseFloat(parts[34]) || price;

      // 查找对应的股票
      const stockInfo = ALL_STOCKS.find((s) => s.code.endsWith(code) || code === s.code);
      if (!stockInfo || isNaN(price)) continue;

      const symbol = stockInfo.symbol;
      // 使用本地预设的名称，避免 GBK 编码问题
      const name = STOCK_NAMES[symbol] || stockInfo.name;
      const previousPrice = this.prices.get(symbol)?.price || prevClose;
      const change = price - prevClose;
      const changePercent = prevClose > 0 ? (change / prevClose) * 100 : 0;

      this.prices.set(symbol, { price, previousClose: prevClose, name });

      const marketData: MarketData = {
        symbol,
        price,
        change,
        changePercent,
        volume,
        high,
        low,
        open,
        timestamp: Date.now(),
      };

      // 广播到对应频道
      this.wsServer.broadcast(`market:${symbol}`, marketData);

      // A股额外广播到 market:cn 频道
      const isCN = symbol.match(/^(6|0|3)\d{5}$/);
      if (isCN) {
        this.wsServer.broadcast('market:cn', { ...marketData, name });
      }

      marketPrices.set(symbol, price);
    }

    if (marketPrices.size > 0) {
      portfolioService.updateFromMarketData(marketPrices);
    }
  }

  /**
   * 网络错误时模拟微小价格变化
   */
  private simulateSmallChanges(): void {
    if (this.prices.size === 0) return;

    const marketPrices = new Map<string, number>();

    this.prices.forEach((data, symbol) => {
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
      '600519': 1445.0,
      '000858': 165.0,
      '601318': 42.0,
      '000333': 58.0,
      '600036': 32.0,
      '601012': 6.5,
      '000651': 42.0,
      '002594': 85.0,
      'AAPL': 215.0,
      'GOOGL': 168.0,
      'MSFT': 415.0,
      'NVDA': 880.0,
      'TSLA': 250.0,
    };

    ALL_STOCKS.forEach(({ symbol, name }) => {
      const price = defaults[symbol] || 100;
      this.prices.set(symbol, { price, previousClose: price, name });
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
