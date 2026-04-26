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
  { symbol: 'POL_USDT', name: 'Polygon', okxSymbol: 'POL-USDT' },
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

  // T1 优质候选
  { symbol: 'PEPE_USDT', name: 'Pepe', okxSymbol: 'PEPE-USDT' },
  { symbol: 'SHIB_USDT', name: 'Shiba Inu', okxSymbol: 'SHIB-USDT' },
  { symbol: 'BONK_USDT', name: 'Bonk', okxSymbol: 'BONK-USDT' },
  { symbol: 'FLOKI_USDT', name: 'Floki', okxSymbol: 'FLOKI-USDT' },
  { symbol: 'BOME_USDT', name: 'Book of Meme', okxSymbol: 'BOME-USDT' },
  { symbol: 'GALA_USDT', name: 'Gala', okxSymbol: 'GALA-USDT' },
  { symbol: 'NOT_USDT', name: 'Notcoin', okxSymbol: 'NOT-USDT' },
  { symbol: 'ENA_USDT', name: 'Ethena', okxSymbol: 'ENA-USDT' },
  { symbol: 'CORE_USDT', name: 'Core', okxSymbol: 'CORE-USDT' },
  { symbol: 'TRX_USDT', name: 'TRON', okxSymbol: 'TRX-USDT' },

  // T2 次优候选
  { symbol: 'DOG_USDT', name: 'Dog', okxSymbol: 'DOG-USDT' },
  { symbol: 'HOT_USDT', name: 'Holo', okxSymbol: 'HOT-USDT' },
  { symbol: 'HMSTR_USDT', name: 'Hamster Kombat', okxSymbol: 'HMSTR-USDT' },
  { symbol: 'VANRY_USDT', name: 'Vanry', okxSymbol: 'VANRY-USDT' },
  { symbol: 'FLR_USDT', name: 'Flare', okxSymbol: 'FLR-USDT' },
  { symbol: 'RSR_USDT', name: 'Reserve Rights', okxSymbol: 'RSR-USDT' },
  { symbol: 'MEW_USDT', name: 'cat in a dogs world', okxSymbol: 'MEW-USDT' },
  { symbol: 'TURBO_USDT', name: 'Turbo', okxSymbol: 'TURBO-USDT' },
  { symbol: 'GLMR_USDT', name: 'Moonbeam', okxSymbol: 'GLMR-USDT' },
  { symbol: 'CKB_USDT', name: 'Nervos Network', okxSymbol: 'CKB-USDT' },
  { symbol: 'ZKJ_USDT', name: 'zkSync', okxSymbol: 'ZKJ-USDT' },
  { symbol: 'ALT_USDT', name: 'AltLayer', okxSymbol: 'ALT-USDT' },
  { symbol: 'REZ_USDT', name: 'Renzo', okxSymbol: 'REZ-USDT' },
  { symbol: 'BRETT_USDT', name: 'Brett', okxSymbol: 'BRETT-USDT' },
  { symbol: 'KAS_USDT', name: 'Kaspa', okxSymbol: 'KAS-USDT' },
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
   * 获取所有交易对行情（使用单个批量请求）
   */
  private async fetchAllTickers(): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/spot/tickers`, {
        headers: {
          'Content-Type': 'application/json',
        },
        agent: proxyAgent,
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const allTickers: GateTicker[] = await response.json() as GateTicker[];

      // 本地过滤出我们关心的交易对
      const ourSymbols = new Set(TRADING_PAIRS.map(p => p.symbol));
      const ourTickers = allTickers.filter(t => ourSymbols.has(t.currency_pair));

      this.processTickers(ourTickers);

      if (!this.initialized && ourTickers.length > 0) {
        this.initialized = true;
        logger.info(`Gate data initialized successfully with ${ourTickers.length} pairs`);
      }
    } catch (error: any) {
      // 出错时保留上次有效数据，不生成随机模拟数据
      logger.warn(`Gate fetch error: ${error.message}`);
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
