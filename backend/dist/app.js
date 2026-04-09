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
const index_1 = require("./config/index");
const error_1 = require("./middleware/error");
const connection_1 = require("./dao/connection");
const logger_1 = require("./config/logger");
const index_2 = require("./websocket/index");
const market_1 = require("./websocket/market");
const tencent_1 = require("./websocket/tencent");
const okx_1 = require("./websocket/okx");
const gate_1 = require("./websocket/gate");
const spread_monitor_1 = require("./websocket/spread-monitor");
const server_1 = require("./websocket/server");
// 路由
const auth_1 = __importDefault(require("./routes/auth"));
const strategy_1 = __importDefault(require("./routes/strategy"));
const portfolio_1 = __importDefault(require("./routes/portfolio"));
function createApp() {
    const app = new koa_1.default();
    // 全局错误处理
    app.use(error_1.errorHandler);
    // CORS
    app.use((0, cors_1.default)({
        origin: index_1.config.nodeEnv === 'development' ? '*' : index_1.config.host,
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
        logger_1.logger.info(`${ctx.method} ${ctx.url} - ${ctx.status} - ${duration}ms`);
    });
    // API 路由
    const apiRouter = new koa_router_1.default({ prefix: '/api' });
    // 匂载子路由
    app.use(apiRouter.routes());
    app.use(auth_1.default.routes());
    app.use(strategy_1.default.routes());
    app.use(portfolio_1.default.routes());
    // 404 处理
    app.use(error_1.notFoundHandler);
    return app;
}
// 启动服务器
async function start() {
    try {
        // 初始化数据库连接
        console.log('Starting database initialization...');
        await (0, connection_1.initDatabase)();
        console.log('Database initialized successfully');
        const app = createApp();
        // 创建 HTTP 服务器
        const server = app.listen(index_1.config.port, () => {
            logger_1.logger.info(`Server running on http://${index_1.config.host}:${index_1.config.port}`);
            logger_1.logger.info(`Database: ${index_1.config.database.type}`);
        });
        // 初始化 WebSocket 服务器
        const wss = new index_2.WebSocketServer(server);
        (0, server_1.setWsServer)(wss);
        logger_1.logger.info('WebSocket server initialized at /ws');
        // 初始化行情数据源
        if (index_1.config.nodeEnv === 'development') {
            // 优先使用腾讯财经真实数据
            try {
                const tm = new tencent_1.TencentFinanceMarket(wss);
                (0, server_1.setTencentMarket)(tm);
                await tm.start();
                logger_1.logger.info('Tencent Finance market data service started');
            }
            catch (e) {
                logger_1.logger.warn('Tencent Finance unavailable, falling back to simulator');
                const ms = new market_1.MarketSimulator(wss);
                (0, server_1.setMarketSimulator)(ms);
                ms.start();
            }
        }
        // 启动加密货币数据服务
        try {
            const okx = new okx_1.OkxMarket(wss);
            (0, server_1.setOkxMarket)(okx);
            await okx.start();
            logger_1.logger.info('OKX market data service started');
        }
        catch (e) {
            logger_1.logger.warn('OKX market data service failed to start:', e);
        }
        try {
            const gate = new gate_1.GateMarket(wss);
            (0, server_1.setGateMarket)(gate);
            await gate.start();
            logger_1.logger.info('Gate market data service started');
        }
        catch (e) {
            logger_1.logger.warn('Gate market data service failed to start:', e);
        }
        // 启动价差监控服务
        try {
            const monitor = new spread_monitor_1.SpreadMonitor(wss);
            (0, server_1.setSpreadMonitor)(monitor);
            await monitor.start();
            logger_1.logger.info('Spread monitor service started');
        }
        catch (e) {
            logger_1.logger.warn('Spread monitor service failed to start:', e);
        }
        // 优雅关闭
        const gracefulShutdown = async () => {
            logger_1.logger.info('Shutting down gracefully...');
            // 关闭行情服务
            if (server_1.marketSimulator) {
                server_1.marketSimulator.stop();
            }
            if (server_1.tencentMarket) {
                server_1.tencentMarket.stop();
            }
            if (server_1.okxMarket) {
                server_1.okxMarket.stop();
            }
            if (server_1.gateMarket) {
                server_1.gateMarket.stop();
            }
            if (server_1.spreadMonitor) {
                server_1.spreadMonitor.stop();
            }
            // 关闭 WebSocket
            if (server_1.wsServer) {
                server_1.wsServer.close();
            }
            // 关闭 HTTP 服务器
            server.close(async () => {
                await (0, connection_1.closeDatabase)();
                logger_1.logger.info('Server closed');
                process.exit(0);
            });
            // 强制退出超时
            setTimeout(() => {
                logger_1.logger.warn('Forced shutdown');
                process.exit(1);
            }, 10000);
        };
        process.on('SIGTERM', gracefulShutdown);
        process.on('SIGINT', gracefulShutdown);
        return { server, wsServer: server_1.wsServer };
    }
    catch (error) {
        logger_1.logger.error('Failed to start server:', error);
        process.exit(1);
    }
}
// 如果直接运行此文件（通过 node dist/app.js 或 tsx src/app.ts）
if (process.argv[1]?.endsWith('dist/app.js') || process.argv[1]?.includes('app.ts')) {
    start();
}
//# sourceMappingURL=app.js.map