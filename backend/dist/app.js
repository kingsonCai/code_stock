"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createApp = createApp;
exports.start = start;
/**
 * Koa 应用入口
 */
const koa_1 = __importDefault(require("koa"));
const koa_body_1 = require("koa-body");
const cors_1 = __importDefault(require("@koa/cors"));
const koa_router_1 = __importDefault(require("koa-router"));
const index_js_1 = require("./config/index.js");
const error_js_1 = require("./middleware/error.js");
const connection_js_1 = require("./dao/connection.js");
const logger_js_1 = require("./config/logger.js");
const index_js_2 = require("./websocket/index.js");
const market_js_1 = require("./websocket/market.js");
const tencent_js_1 = require("./websocket/tencent.js");
const okx_js_1 = require("./websocket/okx.js");
const gate_js_1 = require("./websocket/gate.js");
const spread_monitor_js_1 = require("./websocket/spread-monitor.js");
const server_js_1 = require("./websocket/server.js");
// 路由
const auth_js_1 = __importDefault(require("./routes/auth.js"));
const strategy_js_1 = __importDefault(require("./routes/strategy.js"));
const portfolio_js_1 = __importDefault(require("./routes/portfolio.js"));
function createApp() {
    const app = new koa_1.default();
    // 全局错误处理
    app.use(error_js_1.errorHandler);
    // CORS
    app.use((0, cors_1.default)({
        origin: index_js_1.config.nodeEnv === 'development' ? '*' : index_js_1.config.host,
        allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
        allowHeaders: ['Content-Type', 'Authorization'],
        credentials: true,
    }));
    // 请求体解析
    app.use((0, koa_body_1.koaBody)({
        json: true,
        multipart: true,
        urlencoded: true,
        formidable: {
            maxFileSize: 10 * 1024 * 1024, // 10MB
        },
    }));
    // 请求日志
    app.use(async (ctx, next) => {
        const start = Date.now();
        await next();
        const duration = Date.now() - start;
        logger_js_1.logger.info(`${ctx.method} ${ctx.url} - ${ctx.status} - ${duration}ms`);
    });
    // API 路由
    const apiRouter = new koa_router_1.default({ prefix: '/api' });
    // 匂载子路由
    app.use(apiRouter.routes());
    app.use(auth_js_1.default.routes());
    app.use(strategy_js_1.default.routes());
    app.use(portfolio_js_1.default.routes());
    // 404 处理
    app.use(error_js_1.notFoundHandler);
    return app;
}
// 启动服务器
async function start() {
    try {
        // 初始化数据库连接
        await (0, connection_js_1.initDatabase)();
        const app = createApp();
        // 创建 HTTP 服务器
        const server = app.listen(index_js_1.config.port, () => {
            logger_js_1.logger.info(`Server running on http://${index_js_1.config.host}:${index_js_1.config.port}`);
            logger_js_1.logger.info(`Database: ${index_js_1.config.database.type}`);
        });
        // 初始化 WebSocket 服务器
        const wss = new index_js_2.WebSocketServer(server);
        (0, server_js_1.setWsServer)(wss);
        logger_js_1.logger.info('WebSocket server initialized at /ws');
        // 初始化行情数据源
        if (index_js_1.config.nodeEnv === 'development') {
            // 优先使用腾讯财经真实数据
            try {
                const tm = new tencent_js_1.TencentFinanceMarket(wss);
                (0, server_js_1.setTencentMarket)(tm);
                await tm.start();
                logger_js_1.logger.info('Tencent Finance market data service started');
            }
            catch (e) {
                logger_js_1.logger.warn('Tencent Finance unavailable, falling back to simulator');
                const ms = new market_js_1.MarketSimulator(wss);
                (0, server_js_1.setMarketSimulator)(ms);
                ms.start();
            }
        }
        // 启动加密货币数据服务
        try {
            const okx = new okx_js_1.OkxMarket(wss);
            (0, server_js_1.setOkxMarket)(okx);
            await okx.start();
            logger_js_1.logger.info('OKX market data service started');
        }
        catch (e) {
            logger_js_1.logger.warn('OKX market data service failed to start:', e);
        }
        try {
            const gate = new gate_js_1.GateMarket(wss);
            (0, server_js_1.setGateMarket)(gate);
            await gate.start();
            logger_js_1.logger.info('Gate market data service started');
        }
        catch (e) {
            logger_js_1.logger.warn('Gate market data service failed to start:', e);
        }
        // 启动价差监控服务
        try {
            const monitor = new spread_monitor_js_1.SpreadMonitor(wss);
            (0, server_js_1.setSpreadMonitor)(monitor);
            await monitor.start();
            logger_js_1.logger.info('Spread monitor service started');
        }
        catch (e) {
            logger_js_1.logger.warn('Spread monitor service failed to start:', e);
        }
        // 优雅关闭
        const gracefulShutdown = async () => {
            logger_js_1.logger.info('Shutting down gracefully...');
            // 关闭行情服务
            if (server_js_1.marketSimulator) {
                server_js_1.marketSimulator.stop();
            }
            if (server_js_1.tencentMarket) {
                server_js_1.tencentMarket.stop();
            }
            if (server_js_1.okxMarket) {
                server_js_1.okxMarket.stop();
            }
            if (server_js_1.gateMarket) {
                server_js_1.gateMarket.stop();
            }
            if (server_js_1.spreadMonitor) {
                server_js_1.spreadMonitor.stop();
            }
            // 关闭 WebSocket
            if (server_js_1.wsServer) {
                server_js_1.wsServer.close();
            }
            // 关闭 HTTP 服务器
            server.close(async () => {
                await (0, connection_js_1.closeDatabase)();
                logger_js_1.logger.info('Server closed');
                process.exit(0);
            });
            // 强制退出超时
            setTimeout(() => {
                logger_js_1.logger.warn('Forced shutdown');
                process.exit(1);
            }, 10000);
        };
        process.on('SIGTERM', gracefulShutdown);
        process.on('SIGINT', gracefulShutdown);
        return { server, wsServer: server_js_1.wsServer };
    }
    catch (error) {
        logger_js_1.logger.error('Failed to start server:', error);
        process.exit(1);
    }
}
// 如果直接运行此文件（通过 node dist/app.js）
if (process.argv[1]?.endsWith('dist/app.js')) {
    start();
}
//# sourceMappingURL=app.js.map