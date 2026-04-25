"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GateMarket = exports.TRADING_PAIRS = void 0;
const logger_js_1 = require("../config/logger.js");
const node_fetch_1 = __importDefault(require("node-fetch"));
const https_proxy_agent_1 = require("https-proxy-agent");
// 配置代理（如果环境变量中设置了）
const proxyUrl = process.env.HTTPS_PROXY || process.env.HTTP_PROXY;
const proxyAgent = proxyUrl ? new https_proxy_agent_1.HttpsProxyAgent(proxyUrl) : undefined;
// Gate 交易对配置 - 与 OKX 共用的20个热门品种
exports.TRADING_PAIRS = [
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
];
class GateMarket {
    wsServer;
    fetchInterval = null;
    prices = new Map();
    initialized = false;
    baseUrl = 'https://api.gateio.ws/api/v4';
    constructor(wsServer) {
        this.wsServer = wsServer;
    }
    /**
     * 启动实时数据获取
     */
    async start() {
        logger_js_1.logger.info('Gate market data service starting...');
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
        logger_js_1.logger.info('Gate market data service stopped');
    }
    /**
     * 获取所有交易对行情（使用单个批量请求）
     */
    async fetchAllTickers() {
        try {
            const response = await (0, node_fetch_1.default)(`${this.baseUrl}/spot/tickers`, {
                headers: {
                    'Content-Type': 'application/json',
                },
                agent: proxyAgent,
            });
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            const allTickers = await response.json();
            // 本地过滤出我们关心的交易对
            const ourSymbols = new Set(exports.TRADING_PAIRS.map(p => p.symbol));
            const ourTickers = allTickers.filter(t => ourSymbols.has(t.currency_pair));
            this.processTickers(ourTickers);
            if (!this.initialized && ourTickers.length > 0) {
                this.initialized = true;
                logger_js_1.logger.info(`Gate data initialized successfully with ${ourTickers.length} pairs`);
            }
        }
        catch (error) {
            // 出错时保留上次有效数据，不生成随机模拟数据
            logger_js_1.logger.warn(`Gate fetch error: ${error.message}`);
        }
    }
    /**
     * 处理行情数据
     */
    processTickers(tickers) {
        for (const ticker of tickers) {
            const pairInfo = exports.TRADING_PAIRS.find(p => p.symbol === ticker.currency_pair);
            if (!pairInfo)
                continue;
            const price = parseFloat(ticker.last);
            const high24h = parseFloat(ticker.high_24h);
            const low24h = parseFloat(ticker.low_24h);
            const volume = parseFloat(ticker.base_volume);
            const changePercent = parseFloat(ticker.change_percentage);
            // 计算24小时开盘价
            // change_percentage 是相对于开盘价的涨跌幅
            // open24h = price / (1 + changePercent / 100)
            const open24h = changePercent !== 0 ? price / (1 + changePercent / 100) : price;
            if (isNaN(price) || price <= 0)
                continue;
            const change = price - open24h;
            this.prices.set(ticker.currency_pair, { price, open24h, name: pairInfo.name });
            const marketData = {
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
            logger_js_1.logger.debug(`Gate ${ticker.currency_pair} (${pairInfo.name}): $${price.toFixed(2)} (${changePercent >= 0 ? '+' : ''}${changePercent.toFixed(2)}%)`);
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
exports.GateMarket = GateMarket;
//# sourceMappingURL=gate.js.map