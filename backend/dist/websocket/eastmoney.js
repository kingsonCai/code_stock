"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EastMoneyMarket = void 0;
const logger_js_1 = require("../config/logger.js");
const portfolio_js_1 = require("../services/portfolio.js");
// 支持的股票代码（东方财富格式：市场代码.股票代码）
const SYMBOLS = [
    { symbol: 'AAPL', secid: '105.AAPL', name: 'Apple Inc.' },
    { symbol: 'GOOGL', secid: '105.GOOGL', name: 'Alphabet Inc.' },
    { symbol: 'MSFT', secid: '105.MSFT', name: 'Microsoft Corp.' },
    { symbol: 'NVDA', secid: '105.NVDA', name: 'NVIDIA Corp.' },
    { symbol: 'TSLA', secid: '105.TSLA', name: 'Tesla Inc.' },
];
class EastMoneyMarket {
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
        logger_js_1.logger.info('East Money market data service starting...');
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
    stop() {
        if (this.fetchInterval) {
            clearInterval(this.fetchInterval);
            this.fetchInterval = null;
        }
        logger_js_1.logger.info('East Money market data service stopped');
    }
    /**
     * 获取所有股票报价
  
     */
    async fetchAllQuotes() {
        const secids = SYMBOLS.map((s) => s.secid).join(',');
        const url = `https://push2.eastmoney.com/api/qt/stock/get?secid=${secids}&fields=f43,f57,f58,f170,f46,f44,f60`;
        try {
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            const data = await response.json();
            if (data && data.data) {
                this.processQuote(data.data);
            }
            if (!this.initialized) {
                this.initialized = true;
                logger_js_1.logger.info('East Money data initialized successfully');
            }
        }
        catch (error) {
            logger_js_1.logger.warn(`East Money fetch error: ${error.message}`);
            this.simulateSmallChanges();
        }
    }
    /**
     * 处理报价数据
  
     */
    processQuote(quote) {
        // 东方财富返回的价格需要除以100
        const price = quote.f43 / 100;
        const prevClose = quote.f57 / 100;
        const open = quote.f58 / 100;
        const high = quote.f170 / 100;
        const low = quote.f46 / 100;
        const volume = quote.f44;
        const symbolInfo = SYMBOLS[0]; // 简化：取第一个symbol
        if (price > 0) {
            const previousPrice = this.prices.get(symbolInfo.symbol)?.price || prevClose;
            this.prices.set(symbolInfo.symbol, { price, previousClose: prevClose });
            const change = price - prevClose;
            const changePercent = prevClose > 0 ? (change / prevClose) * 100 : 0;
            const marketData = {
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
            logger_js_1.logger.debug(`${symbolInfo.symbol}: $${price.toFixed(2)} (${changePercent >= 0 ? '+' : ''}${changePercent.toFixed(2)}%)`);
        }
    }
    /**
     * 网络错误时模拟微小价格变化
  
     */
    simulateSmallChanges() {
        const marketPrices = new Map();
        this.prices.forEach((data, symbol) => {
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
exports.EastMoneyMarket = EastMoneyMarket;
//# sourceMappingURL=eastmoney.js.map