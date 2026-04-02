"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.YahooFinanceMarket = void 0;
/**
 * Yahoo Finance 实时行情数据源
 * 使用 yahoo-finance2 库
 */
const yahoo_finance2_1 = __importDefault(require("yahoo-finance2"));
const logger_js_1 = require("../config/logger.js");
const portfolio_js_1 = require("../services/portfolio.js");
// 实例化 YahooFinance
const yahooFinance = new yahoo_finance2_1.default();
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
class YahooFinanceMarket {
    wsServer;
    fetchInterval = null;
    prices = new Map();
    initialized = false;
    constructor(wsServer) {
        this.wsServer = wsServer;
    }
    /**
     * 启动实时数据获取
     */
    async start() {
        logger_js_1.logger.info('Yahoo Finance market data service starting...');
        // 初始化默认价格
        this.initializeDefaultPrices();
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
    stop() {
        if (this.fetchInterval) {
            clearInterval(this.fetchInterval);
            this.fetchInterval = null;
        }
        logger_js_1.logger.info('Yahoo Finance market data service stopped');
    }
    /**
     * 获取所有股票报价
     */
    async fetchAllQuotes() {
        let successCount = 0;
        for (const { symbol } of SYMBOLS) {
            try {
                // 逐个获取报价
                const quote = await yahooFinance.quote(symbol);
                // quote 是单个对象，直接使用
                if (quote && quote.regularMarketPrice) {
                    console.log('symbol:', symbol, 'quote.regularMarketPrice:', JSON.stringify(quote.regularMarketPrice));
                    this.processQuote({
                        symbol,
                        regularMarketPrice: quote.regularMarketPrice,
                        regularMarketChange: quote.regularMarketChange,
                        regularMarketChangePercent: quote.regularMarketChangePercent,
                        regularMarketVolume: quote.regularMarketVolume,
                        regularMarketDayHigh: quote.regularMarketDayHigh,
                        regularMarketDayLow: quote.regularMarketDayLow,
                        regularMarketOpen: quote.regularMarketOpen,
                        regularMarketPreviousClose: quote.regularMarketPreviousClose,
                    });
                    successCount++;
                }
                // 短暂延迟避免频率限制
                await new Promise((r) => setTimeout(r, 100));
            }
            catch (error) {
                logger_js_1.logger.debug(`Failed to fetch ${symbol}: ${error.message}`);
            }
        }
        if (successCount > 0) {
            // 更新持仓
            const marketPrices = new Map();
            this.prices.forEach((data, symbol) => {
                marketPrices.set(symbol, data.price);
            });
            portfolio_js_1.portfolioService.updateFromMarketData(marketPrices);
            if (!this.initialized) {
                this.initialized = true;
                logger_js_1.logger.info(`Yahoo Finance initialized with ${successCount}/${SYMBOLS.length} symbols`);
            }
        }
        else {
            // 全部失败时使用模拟
            this.simulateSmallChanges();
        }
    }
    /**
     * 处理单个报价
     */
    processQuote(quote) {
        const symbol = quote.symbol;
        const newPrice = quote.regularMarketPrice;
        if (!symbol || !newPrice)
            return;
        const previousClose = quote.regularMarketPreviousClose || newPrice;
        this.prices.set(symbol, { price: newPrice, previousClose });
        const marketData = {
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
        logger_js_1.logger.debug(`${symbol}: $${newPrice.toFixed(2)} (${(quote.regularMarketChangePercent || 0).toFixed(2)}%)`);
    }
    /**
     * 网络错误时模拟微小价格变化
     */
    simulateSmallChanges() {
        const marketPrices = new Map();
        this.prices.forEach((data, symbol) => {
            // 微小随机波动 (-0.05% ~ +0.05%)
            const change = data.price * 0.0005 * (Math.random() - 0.5) * 2;
            const newPrice = Math.max(0.01, data.price + change);
            this.prices.set(symbol, { ...data, price: newPrice });
            marketPrices.set(symbol, newPrice);
            const marketData = {
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
        portfolio_js_1.portfolioService.updateFromMarketData(marketPrices);
    }
    /**
     * 初始化默认价格
     */
    initializeDefaultPrices() {
        const defaults = {
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
}
exports.YahooFinanceMarket = YahooFinanceMarket;
//# sourceMappingURL=yahoo.js.map