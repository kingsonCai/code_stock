/**
 * OKX 交易所实时行情数据源
 * 使用 REST API 获取加密货币实时价格
 * API 文档: https://www.okx.com/docs-v5/
 */
import { WebSocketServer } from './index.js';
import { MarketData } from './types.js';
import { logger } from '../config/logger.js';
import fetch from 'node-fetch';
import { HttpsProxyAgent } from 'https-proxy-agent';

// 配置代理（如果环境变量中设置了）
const proxyUrl = process.env.HTTPS_PROXY || process.env.HTTP_PROXY;
const proxyAgent = proxyUrl ? new HttpsProxyAgent(proxyUrl) : undefined;
if (proxyAgent) {
  logger.info(`OKX using proxy: ${proxyUrl}`);
}

// OKX 交易对配置 - 与 Gate 共用的20个热门品种
export const TRADING_PAIRS = [
  { symbol: 'BTC-USDT', name: 'Bitcoin', gateSymbol: 'BTC_USDT' },
  { symbol: 'ETH-USDT', name: 'Ethereum', gateSymbol: 'ETH_USDT' },
  { symbol: 'SOL-USDT', name: 'Solana', gateSymbol: 'SOL_USDT' },
  { symbol: 'XRP-USDT', name: 'Ripple', gateSymbol: 'XRP_USDT' },
  { symbol: 'DOGE-USDT', name: 'Dogecoin', gateSymbol: 'DOGE_USDT' },
  { symbol: 'ADA-USDT', name: 'Cardano', gateSymbol: 'ADA_USDT' },
  { symbol: 'AVAX-USDT', name: 'Avalanche', gateSymbol: 'AVAX_USDT' },
  { symbol: 'LINK-USDT', name: 'Chainlink', gateSymbol: 'LINK_USDT' },
  { symbol: 'DOT-USDT', name: 'Polkadot', gateSymbol: 'DOT_USDT' },
  { symbol: 'POL-USDT', name: 'Polygon', gateSymbol: 'POL_USDT' },
  { symbol: 'UNI-USDT', name: 'Uniswap', gateSymbol: 'UNI_USDT' },
  { symbol: 'ATOM-USDT', name: 'Cosmos', gateSymbol: 'ATOM_USDT' },
  { symbol: 'LTC-USDT', name: 'Litecoin', gateSymbol: 'LTC_USDT' },
  { symbol: 'BCH-USDT', name: 'Bitcoin Cash', gateSymbol: 'BCH_USDT' },
  { symbol: 'NEAR-USDT', name: 'NEAR', gateSymbol: 'NEAR_USDT' },
  { symbol: 'APT-USDT', name: 'Aptos', gateSymbol: 'APT_USDT' },
  { symbol: 'ARB-USDT', name: 'Arbitrum', gateSymbol: 'ARB_USDT' },
  { symbol: 'OP-USDT', name: 'Optimism', gateSymbol: 'OP_USDT' },
  { symbol: 'FIL-USDT', name: 'Filecoin', gateSymbol: 'FIL_USDT' },
  { symbol: 'AAVE-USDT', name: 'Aave', gateSymbol: 'AAVE_USDT' },

  // T1 优质候选
  { symbol: 'PEPE-USDT', name: 'Pepe', gateSymbol: 'PEPE_USDT' },
  { symbol: 'SHIB-USDT', name: 'Shiba Inu', gateSymbol: 'SHIB_USDT' },
  { symbol: 'BONK-USDT', name: 'Bonk', gateSymbol: 'BONK_USDT' },
  { symbol: 'FLOKI-USDT', name: 'Floki', gateSymbol: 'FLOKI_USDT' },
  { symbol: 'BOME-USDT', name: 'Book of Meme', gateSymbol: 'BOME_USDT' },
  { symbol: 'GALA-USDT', name: 'Gala', gateSymbol: 'GALA_USDT' },
  { symbol: 'NOT-USDT', name: 'Notcoin', gateSymbol: 'NOT_USDT' },
  { symbol: 'ENA-USDT', name: 'Ethena', gateSymbol: 'ENA_USDT' },
  { symbol: 'CORE-USDT', name: 'Core', gateSymbol: 'CORE_USDT' },
  { symbol: 'TRX-USDT', name: 'TRON', gateSymbol: 'TRX_USDT' },

  // T2 次优候选
  { symbol: 'DOG-USDT', name: 'Dog', gateSymbol: 'DOG_USDT' },
  { symbol: 'HOT-USDT', name: 'Holo', gateSymbol: 'HOT_USDT' },
  { symbol: 'HMSTR-USDT', name: 'Hamster Kombat', gateSymbol: 'HMSTR_USDT' },
  { symbol: 'VANRY-USDT', name: 'Vanry', gateSymbol: 'VANRY_USDT' },
  { symbol: 'FLR-USDT', name: 'Flare', gateSymbol: 'FLR_USDT' },
  { symbol: 'RSR-USDT', name: 'Reserve Rights', gateSymbol: 'RSR_USDT' },
  { symbol: 'MEW-USDT', name: 'cat in a dogs world', gateSymbol: 'MEW_USDT' },
  { symbol: 'TURBO-USDT', name: 'Turbo', gateSymbol: 'TURBO_USDT' },
  { symbol: 'GLMR-USDT', name: 'Moonbeam', gateSymbol: 'GLMR_USDT' },
  { symbol: 'CKB-USDT', name: 'Nervos Network', gateSymbol: 'CKB_USDT' },
  { symbol: 'ZKJ-USDT', name: 'zkSync', gateSymbol: 'ZKJ_USDT' },
  { symbol: 'ALT-USDT', name: 'AltLayer', gateSymbol: 'ALT_USDT' },
  { symbol: 'REZ-USDT', name: 'Renzo', gateSymbol: 'REZ_USDT' },
  { symbol: 'BRETT-USDT', name: 'Brett', gateSymbol: 'BRETT_USDT' },
  { symbol: 'KAS-USDT', name: 'Kaspa', gateSymbol: 'KAS_USDT' },
];

// OKX Ticker 响应格式
interface OkxTicker {
  instId: string;        // 产品ID，如 BTC-USDT
  last: string;          // 最新成交价
  open24h: string;       // 24小时开盘价
  high24h: string;       // 24小时最高价
  low24h: string;        // 24小时最低价
  vol24h: string;        // 24小时交易量（基础货币）
  volCcy24h: string;     // 24小时交易量（计价货币）
  ts: string;            // 数据返回时间戳
}

interface OkxResponse {
  code: string;
  msg: string;
  data: OkxTicker[];
}

export class OkxMarket {
  private wsServer: WebSocketServer;
  private fetchInterval: NodeJS.Timeout | null = null;
  private prices: Map<string, { price: number; open24h: number; name: string }> = new Map();
  private initialized = false;
  private readonly baseUrl = 'https://www.okx.com/api/v5/market';

  constructor(wsServer: WebSocketServer) {
    this.wsServer = wsServer;
  }

  /**
   * 启动实时数据获取
   */
  async start(): Promise<void> {
    logger.info('OKX market data service starting...');

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
    logger.info('OKX market data service stopped');
  }

  /**
   * 获取所有交易对行情
   */
  private async fetchAllTickers(): Promise<void> {
    try {
      // 批量获取所有交易对行情
      const instIds = TRADING_PAIRS.map(p => p.symbol).join(',');
      const url = `${this.baseUrl}/tickers?instType=SPOT`;

      const response = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
        },
        agent: proxyAgent,
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const result: OkxResponse = await response.json() as OkxResponse;

      if (result.code !== '0') {
        throw new Error(`OKX API error: ${result.msg}`);
      }

      // 过滤我们关注的交易对
      const ourSymbols = new Set(TRADING_PAIRS.map(p => p.symbol));
      const filteredData = result.data.filter(ticker => ourSymbols.has(ticker.instId));

      this.processTickers(filteredData);

      if (!this.initialized) {
        this.initialized = true;
        logger.info(`OKX data initialized successfully with ${filteredData.length} pairs`);
      }
    } catch (error: any) {
      logger.warn(`OKX fetch error: ${error.message}`);
    }
  }

  /**
   * 处理行情数据
   */
  private processTickers(tickers: OkxTicker[]): void {
    for (const ticker of tickers) {
      const pairInfo = TRADING_PAIRS.find(p => p.symbol === ticker.instId);
      if (!pairInfo) continue;

      const price = parseFloat(ticker.last);
      const open24h = parseFloat(ticker.open24h);
      const high24h = parseFloat(ticker.high24h);
      const low24h = parseFloat(ticker.low24h);
      const volume = parseFloat(ticker.vol24h);

      if (isNaN(price) || price <= 0) continue;

      const change = open24h > 0 ? price - open24h : 0;
      const changePercent = open24h > 0 ? (change / open24h) * 100 : 0;

      this.prices.set(ticker.instId, { price, open24h, name: pairInfo.name });

      const marketData: MarketData = {
        symbol: ticker.instId,
        price,
        change,
        changePercent,
        volume,
        high: high24h,
        low: low24h,
        open: open24h,
        timestamp: Date.now(),
      };

      // 广播到对应频道
      this.wsServer.broadcast(`market:crypto:${ticker.instId}`, marketData);

      // 广播到加密货币汇总频道
      this.wsServer.broadcast('market:crypto', { ...marketData, name: pairInfo.name });

      logger.debug(`OKX ${ticker.instId} (${pairInfo.name}): $${price.toFixed(2)} (${changePercent >= 0 ? '+' : ''}${changePercent.toFixed(2)}%)`);
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
