/**
 * Koa 应用入口
 */
import Koa from 'koa';
import { koaBody } from 'koa-body';
import cors from '@koa/cors';
import Router from 'koa-router';
import { Server as HttpServer } from 'http';
import { config } from './config/index';
import { errorHandler, notFoundHandler } from './middleware/error';
import { initDatabase, closeDatabase } from './dao/connection';
import { logger } from './config/logger';
import { WebSocketServer } from './websocket/index';
import { TencentFinanceMarket } from './websocket/tencent';
import { OkxMarket } from './websocket/okx';
import { GateMarket } from './websocket/gate';
import { SpreadMonitor } from './websocket/spread-monitor';
import { setWsServer, setTencentMarket, setOkxMarket, setGateMarket, setSpreadMonitor, wsServer, tencentMarket, okxMarket, gateMarket, spreadMonitor } from './websocket/server';

// 路由
import authRoutes from './routes/auth';
import strategyRoutes from './routes/strategy';
import portfolioRoutes from './routes/portfolio';

export function createApp(): Koa {
  const app = new Koa();

  // 全局错误处理
  app.use(errorHandler);

  // CORS
  app.use(
    cors({
      origin: config.nodeEnv === 'development' ? '*' : config.host,
      allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      allowHeaders: ['Content-Type', 'Authorization'],
      credentials: true,
    })
  );

  // 请求体解析
  app.use(
    koaBody({
      json: true,
      multipart: true,
      urlencoded: true,
      formidable: {
        maxFileSize: 10 * 1024 * 1024, // 10MB
      },
    })
  );

  // 请求日志
  app.use(async (ctx, next) => {
    const start = Date.now();
    await next();
    const duration = Date.now() - start;
    logger.info(`${ctx.method} ${ctx.url} - ${ctx.status} - ${duration}ms`);
  });

  // API 路由
  const apiRouter = new Router({ prefix: '/api' });

  // 匂载子路由
  app.use(apiRouter.routes());
  app.use(authRoutes.routes());
  app.use(strategyRoutes.routes());
  app.use(portfolioRoutes.routes());

  // 404 处理
  app.use(notFoundHandler);

  return app;
}

// 启动服务器
async function start() {
  try {
    // 初始化数据库连接
    logger.info('Starting database initialization...');
    await initDatabase();
    logger.info('Database initialized successfully');

    const app = createApp();

    // 创建 HTTP 服务器
    const server = app.listen(config.port, () => {
      logger.info(`Server running on http://${config.host}:${config.port}`);
      logger.info(`Database: ${config.database.type}`);
    });

    // 初始化 WebSocket 服务器
    const wss = new WebSocketServer(server as HttpServer);
    setWsServer(wss);
    logger.info('WebSocket server initialized at /ws');

    // 初始化行情数据源
    if (config.nodeEnv === 'development') {
      try {
        const tm = new TencentFinanceMarket(wss);
        setTencentMarket(tm);
        await tm.start();
        logger.info('Tencent Finance market data service started');
      } catch (e) {
        logger.warn('Tencent Finance unavailable');
      }
    }

    // 启动加密货币数据服务
    try {
      const okx = new OkxMarket(wss);
      setOkxMarket(okx);
      await okx.start();
      logger.info('OKX market data service started');
    } catch (e) {
      logger.warn('OKX market data service failed to start:', e);
    }

    try {
      const gate = new GateMarket(wss);
      setGateMarket(gate);
      await gate.start();
      logger.info('Gate market data service started');
    } catch (e) {
      logger.warn('Gate market data service failed to start:', e);
    }

    // 启动价差监控服务
    try {
      const monitor = new SpreadMonitor(wss);
      setSpreadMonitor(monitor);
      await monitor.start();
      logger.info('Spread monitor service started');
    } catch (e) {
      logger.warn('Spread monitor service failed to start:', e);
    }

    // 优雅关闭
    const gracefulShutdown = async () => {
      logger.info('Shutting down gracefully...');

      // 关闭行情服务
      if (tencentMarket) {
        tencentMarket.stop();
      }
      if (okxMarket) {
        okxMarket.stop();
      }
      if (gateMarket) {
        gateMarket.stop();
      }
      if (spreadMonitor) {
        spreadMonitor.stop();
      }

      // 关闭 WebSocket
      if (wsServer) {
        wsServer.close();
      }

      // 关闭 HTTP 服务器
      server.close(async () => {
        await closeDatabase();
        logger.info('Server closed');
        process.exit(0);
      });

      // 强制退出超时
      setTimeout(() => {
        logger.warn('Forced shutdown');
        process.exit(1);
      }, 10000);
    };

    process.on('SIGTERM', gracefulShutdown);
    process.on('SIGINT', gracefulShutdown);

    return { server, wsServer };
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

// 如果直接运行此文件（通过 node dist/app.js 或 tsx src/app.ts）
if (require.main === module) {
  start();
}

export { start };
