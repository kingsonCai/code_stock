"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OkxMarket = exports.TRADING_PAIRS = void 0;
const logger_js_1 = require("../config/logger.js");
const node_fetch_1 = __importDefault(require("node-fetch"));
const https_proxy_agent_1 = require("https-proxy-agent");
// 配置代理（如果环境变量中设置了）
const proxyUrl = process.env.HTTPS_PROXY || process.env.HTTP_PROXY;
const proxyAgent = proxyUrl ? new https_proxy_agent_1.HttpsProxyAgent(proxyUrl) : undefined;
if (proxyAgent) {
    logger_js_1.logger.info(`OKX using proxy: ${proxyUrl}`);
}
// OKX 交易对配置 - 与 Gate 共用的20个热门品种
exports.TRADING_PAIRS = [
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
];
class OkxMarket {
    wsServer;
    fetchInterval = null;
    prices = new Map();
    initialized = false;
    baseUrl = 'https://www.okx.com/api/v5/market';
    constructor(wsServer) {
        this.wsServer = wsServer;
    }
    /**
     * 启动实时数据获取
     */
    async start() {
        logger_js_1.logger.info('OKX market data service starting...');
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
    stop() {
        if (this.fetchInterval) {
            clearInterval(this.fetchInterval);
            this.fetchInterval = null;
        }
        logger_js_1.logger.info('OKX market data service stopped');
    }
    /**
     * 获取所有交易对行情
     */
    async fetchAllTickers() {
        try {
            // 批量获取所有交易对行情
            const instIds = exports.TRADING_PAIRS.map(p => p.symbol).join(',');
            const url = `${this.baseUrl}/tickers?instType=SPOT`;
            const response = await (0, node_fetch_1.default)(url, {
                headers: {
                    'Content-Type': 'application/json',
                },
                agent: proxyAgent,
            });
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            const result = await response.json();
            if (result.code !== '0') {
                throw new Error(`OKX API error: ${result.msg}`);
            }
            // 过滤我们关注的交易对
            const ourSymbols = new Set(exports.TRADING_PAIRS.map(p => p.symbol));
            const filteredData = result.data.filter(ticker => ourSymbols.has(ticker.instId));
            this.processTickers(filteredData);
            if (!this.initialized) {
                this.initialized = true;
                logger_js_1.logger.info(`OKX data initialized successfully with ${filteredData.length} pairs`);
            }
        }
        catch (error) {
            logger_js_1.logger.warn(`OKX fetch error: ${error.message}`);
        }
    }
    /**
     * 处理行情数据
     */
    processTickers(tickers) {
        for (const ticker of tickers) {
            const pairInfo = exports.TRADING_PAIRS.find(p => p.symbol === ticker.instId);
            if (!pairInfo)
                continue;
            const price = parseFloat(ticker.last);
            const open24h = parseFloat(ticker.open24h);
            const high24h = parseFloat(ticker.high24h);
            const low24h = parseFloat(ticker.low24h);
            const volume = parseFloat(ticker.vol24h);
            if (isNaN(price) || price <= 0)
                continue;
            const change = open24h > 0 ? price - open24h : 0;
            const changePercent = open24h > 0 ? (change / open24h) * 100 : 0;
            this.prices.set(ticker.instId, { price, open24h, name: pairInfo.name });
            const marketData = {
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
            logger_js_1.logger.debug(`OKX ${ticker.instId} (${pairInfo.name}): $${price.toFixed(2)} (${changePercent >= 0 ? '+' : ''}${changePercent.toFixed(2)}%)`);
        }
    }
    /**
     * 获取当前价格
     */
    getPrice(symbol) {
        return this.prices.get(symbol)?.price;
    }
    /**
     * 获取所有价格
     */
    getAllPrices() {
        const result = new Map();
        this.prices.forEach((data, symbol) => {
            result.set(symbol, data.price);
        });
        return result;
    }
    /**
     * 获取支持的交易对列表
     */
    static getTradingPairs() {
        return exports.TRADING_PAIRS;
    }
}
exports.OkxMarket = OkxMarket;
//# sourceMappingURL=okx.js.map