/**
 * Gate.io 交易所实时行情数据源
 * 使用 REST API 获取加密货币实时价格
 * API 文档: https://www.gate.com/docs/developers/apiv4/
 */
import { WebSocketServer } from './index.js';
import { MarketData } from './types.js';
import { logger } from '../config/logger.js';
import fetch from 'node-fetch';
import { HttpsProxyAgent } from 'https-proxy-agent';

// 配置代理（如果环境变量中设置了）
const proxyUrl = process.env.HTTPS_PROXY || process.env.HTTP_PROXY;
const proxyAgent = proxyUrl ? new HttpsProxyAgent(proxyUrl) : undefined;

// Gate 交易对配置 - 与 OKX 共用的20个热门品种
export const TRADING_PAIRS = [
  { symbol: 'BTC_USDT', name: 'Bitcoin', okxSymbol: 'BTC-USDT' },
  { symbol: 'ETH_USDT', name: 'Ethereum', okxSymbol: 'ETH-USDT' },
  { symbol: 'SOL_USDT', name: 'Solana', okxSymbol: 'SOL-USDT' },
  { symbol: 'XRP_USDT', name: 'Ripple', okxSymbol: 'XRP-USDT' },
  { symbol: 'DOGE_USDT', name: 'Dogecoin', okxSymbol: 'DOGE-USDT' },
  { symbol: 'ADA_USDT', name: 'Cardano', okxSymbol: 'ADA-USDT' },
  { symbol: 'AVAX_USDT', name: 'Avalanche', okxSymbol: 'AVAX-USDT' },
  { symbol: 'LINK_USDT', name: 'Chainlink', okxSymbol: 'LINK-USDT' },
  { symbol: 'DOT_USDT', name: 'Polkadot', okxSymbol: 'DOT-USDT' },
  { symbol: 'MATIC_USDT', name: 'Polygon', okxSymbol: 'MATIC-USDT' },
  { symbol: 'UNI_USDT', name: 'Uniswap', okxSymbol: 'UNI-USDT' },
  { symbol: 'ATOM_USDT', name: 'Cosmos', okxSymbol: 'ATOM-USDT' },
  { symbol: 'LTC_USDT', name: 'Litecoin', okxSymbol: 'LTC-USDT' },
  { symbol: 'BCH_USDT', name: 'Bitcoin Cash', okxSymbol: 'BCH-USDT' },
  { symbol: 'NEAR_USDT', name: 'NEAR', okxSymbol: 'NEAR-USDT' },
  { symbol: 'APT_USDT', name: 'Aptos', okxSymbol: 'APT-USDT' },
  { symbol: 'ARB_USDT', name: 'Arbitrum', okxSymbol: 'ARB-USDT' },
  { symbol: 'OP_USDT', name: 'Optimism', okxSymbol: 'OP-USDT' },
  { symbol: 'FIL_USDT', name: 'Filecoin', okxSymbol: 'FIL-USDT' },
  { symbol: 'AAVE_USDT', name: 'Aave', okxSymbol: 'AAVE-USDT' },
];

// Gate Ticker 响应格式
interface GateTicker {
  currency_pair: string;  // 交易对，如 BTC_USDT
  last: string;           // 最新成交价
  lowest_ask: string;     // 最优卖单价
  highest_bid: string;    // 最优买单价
  change_percentage: string; // 涨跌幅百分比
  change_utc0: string;    // UTC 0 时涨跌
  change_utc8: string;    // UTC 8 时涨跌
  base_volume: string;    // 24小时交易量（基础货币）
  quote_volume: string;   // 24小时交易量（计价货币）
  high_24h: string;       // 24小时最高价
  low_24h: string;        // 24小时最低价
  etf_net_value: string;  // ETF 净值
  etf_pre_net_value: string; // ETF 前净值
  etf_pre_timestamp: number; // ETF 前净值时间戳
  etf_leverage: string;   // ETF 杠杆
}

export class GateMarket {
  private wsServer: WebSocketServer;
  private fetchInterval: NodeJS.Timeout | null = null;
  private prices: Map<string, { price: number; open24h: number; name: string }> = new Map();
  private initialized = false;
  private readonly baseUrl = 'https://api.gateio.ws/api/v4';

  constructor(wsServer: WebSocketServer) {
    this.wsServer = wsServer;
  }

  /**
   * 启动实时数据获取
   */
  async start(): Promise<void> {
    logger.info('Gate market data service starting...');

    // 初始化默认价格
    this.initializeDefaultPrices();

    // 首次获取真实价格
    await this.fetchAllTickers();

    // 每 3 秒更新一次
    this.fetchInterval = setInterval(() => {
      this.fetchAllTickers();
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
    logger.info('Gate market data service stopped');
  }

  /**
   * 获取所有交易对行情
   */
  private async fetchAllTickers(): Promise<void> {
    let url = '';
    try {
      const allTickers: GateTicker[] = [];

      // Gate API 不支持批量查询，需要单独请求每个交易对
      for (const pair of TRADING_PAIRS) {
        url = `${this.baseUrl}/spot/tickers?currency_pair=${pair.symbol}`;

        const response = await fetch(url, {
          headers: {
            'Content-Type': 'application/json',
          },
          agent: proxyAgent,
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const tickers: GateTicker[] = await response.json() as GateTicker[];
        allTickers.push(...tickers);
      }

      this.processTickers(allTickers);

      if (!this.initialized) {
        this.initialized = true;
        logger.info(`Gate data initialized successfully with ${allTickers.length} pairs`);
      }
    } catch (error: any) {
      logger.warn(`Gate fetch error (${url}): ${error.message}`);
      this.simulateSmallChanges();
    }
  }

  /**
   * 处理行情数据
   */
  private processTickers(tickers: GateTicker[]): void {
    for (const ticker of tickers) {
      const pairInfo = TRADING_PAIRS.find(p => p.symbol === ticker.currency_pair);
      if (!pairInfo) continue;

      const price = parseFloat(ticker.last);
      const high24h = parseFloat(ticker.high_24h);
      const low24h = parseFloat(ticker.low_24h);
      const volume = parseFloat(ticker.base_volume);
      const changePercent = parseFloat(ticker.change_percentage);

      // 计算24小时开盘价
      // change_percentage 是相对于开盘价的涨跌幅
      // open24h = price / (1 + changePercent / 100)
      const open24h = changePercent !== 0 ? price / (1 + changePercent / 100) : price;

      if (isNaN(price) || price <= 0) continue;

      const change = price - open24h;

      this.prices.set(ticker.currency_pair, { price, open24h, name: pairInfo.name });

      const marketData: MarketData = {
        symbol: ticker.currency_pair,
        price,
        change,
        changePercent,
        volume,
        high: high24h || price * 1.01,
        low: low24h || price * 0.99,
        open: open24h,
        timestamp: Date.now(),
      };

      // 广播到对应频道
      this.wsServer.broadcast(`market:crypto:${ticker.currency_pair}`, marketData);

      // 广播到加密货币汇总频道
      this.wsServer.broadcast('market:crypto', { ...marketData, name: pairInfo.name });

      logger.debug(`Gate ${ticker.currency_pair} (${pairInfo.name}): $${price.toFixed(2)} (${changePercent >= 0 ? '+' : ''}${changePercent.toFixed(2)}%)`);
    }
  }

  /**
   * 网络错误时模拟微小价格变化
   */
  private simulateSmallChanges(): void {
    if (this.prices.size === 0) return;

    this.prices.forEach((data, symbol) => {
      const change = data.price * 0.001 * (Math.random() - 0.5) * 2;
      const newPrice = Math.max(0.01, data.price + change);

      this.prices.set(symbol, { ...data, price: newPrice });

      const marketData: MarketData = {
        symbol,
        price: newPrice,
        change: change,
        changePercent: (change / data.price) * 100,
        volume: Math.floor(Math.random() * 1000000),
        high: newPrice * 1.005,
        low: newPrice * 0.995,
        open: data.open24h || newPrice,
        timestamp: Date.now(),
      };

      this.wsServer.broadcast(`market:crypto:${symbol}`, marketData);
    });
  }

  /**
   * 初始化默认价格
   */
  private initializeDefaultPrices(): void {
    const defaults: Record<string, number> = {
      'BTC_USDT': 67000.0,
      'ETH_USDT': 3400.0,
      'SOL_USDT': 145.0,
      'XRP_USDT': 0.52,
      'DOGE_USDT': 0.12,
      'ADA_USDT': 0.45,
      'AVAX_USDT': 35.0,
      'LINK_USDT': 14.0,
      'DOT_USDT': 7.0,
      'MATIC_USDT': 0.7,
      'UNI_USDT': 7.5,
      'ATOM_USDT': 8.5,
      'LTC_USDT': 85.0,
      'BCH_USDT': 480.0,
      'NEAR_USDT': 7.0,
      'APT_USDT': 9.5,
      'ARB_USDT': 1.1,
      'OP_USDT': 2.5,
      'FIL_USDT': 5.5,
      'AAVE_USDT': 95.0,
    };

    TRADING_PAIRS.forEach(({ symbol, name }) => {
      const price = defaults[symbol] || 100;
      this.prices.set(symbol, { price, open24h: price, name });
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

  /**
   * 获取支持的交易对列表
   */
  static getTradingPairs() {
    return TRADING_PAIRS;
  }
}
