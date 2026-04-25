"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SpreadMonitor = void 0;
const server_js_1 = require("./server.js");
const server_js_2 = require("./server.js");
const logger_js_1 = require("../config/logger.js");
const okx_js_1 = require("./okx.js");
class SpreadMonitor {
    wsServer;
    updateInterval = null;
    spreads = new Map();
    config;
    initialized = false;
    constructor(wsServer, config) {
        this.wsServer = wsServer;
        this.config = {
            updateInterval: 3000,
            ...config,
        };
    }
    /**
     * 启动价差监控
     */
    async start() {
        logger_js_1.logger.info('Spread monitor starting...');
        // 首次计算
        this.calculateSpreads();
        // 定时更新
        this.updateInterval = setInterval(() => {
            this.calculateSpreads();
        }, this.config.updateInterval);
    }
    /**
     * 停止价差监控
     */
    stop() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
            this.updateInterval = null;
        }
        logger_js_1.logger.info('Spread monitor stopped');
    }
    /**
     * 计算所有交易对的价差
     */
    calculateSpreads() {
        if (!server_js_1.okxMarket || !server_js_2.gateMarket) {
            if (!this.initialized) {
                logger_js_1.logger.warn('Spread monitor waiting for OKX and Gate markets to initialize...');
            }
            return;
        }
        const okxPrices = server_js_1.okxMarket.getAllPrices();
        const gatePrices = server_js_2.gateMarket.getAllPrices();
        const spreadsArray = [];
        for (const pair of okx_js_1.TRADING_PAIRS) {
            const okxPrice = okxPrices.get(pair.symbol) ?? null;
            const gatePrice = gatePrices.get(pair.gateSymbol) ?? null;
            const hasBoth = okxPrice !== null && gatePrice !== null;
            let spread = null;
            let spreadPercent = null;
            let premium = null;
            if (hasBoth) {
                spread = okxPrice - gatePrice;
                const avgPrice = (okxPrice + gatePrice) / 2;
                spreadPercent = avgPrice > 0 ? (spread / avgPrice) * 100 : 0;
                premium = spread > 0 ? 'OKX' : spread < 0 ? 'Gate' : 'None';
            }
            const spreadData = {
                symbol: pair.symbol.replace('-USDT', ''),
                okxSymbol: pair.symbol,
                gateSymbol: pair.gateSymbol,
                okxPrice,
                gatePrice,
                spread,
                spreadPercent,
                premium,
                timestamp: Date.now(),
            };
            this.spreads.set(pair.symbol, spreadData);
            spreadsArray.push(spreadData);
        }
        // 有数据的排前面，无数据的排后面，按 |价差百分比| 降序
        spreadsArray.sort((a, b) => {
            if (a.spreadPercent === null && b.spreadPercent === null)
                return 0;
            if (a.spreadPercent === null)
                return 1;
            if (b.spreadPercent === null)
                return -1;
            return Math.abs(b.spreadPercent) - Math.abs(a.spreadPercent);
        });
        // 广播价差数据
        this.wsServer.broadcast('market:spread', {
            spreads: spreadsArray,
            timestamp: Date.now(),
        });
        if (!this.initialized) {
            this.initialized = true;
            logger_js_1.logger.info(`Spread monitor initialized with ${spreadsArray.length} pairs`);
        }
    }
    /**
     * 获取当前价差数据
     */
    getSpreads() {
        return Array.from(this.spreads.values())
            .sort((a, b) => {
            if (a.spreadPercent === null && b.spreadPercent === null)
                return 0;
            if (a.spreadPercent === null)
                return 1;
            if (b.spreadPercent === null)
                return -1;
            return Math.abs(b.spreadPercent) - Math.abs(a.spreadPercent);
        });
    }
    /**
     * 获取单个交易对的价差
     */
    getSpread(symbol) {
        return this.spreads.get(symbol);
    }
}
exports.SpreadMonitor = SpreadMonitor;
//# sourceMappingURL=spread-monitor.js.map