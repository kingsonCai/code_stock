/**
 * 投资组合路由
 */
import Router from 'koa-router';
import { z } from 'zod';
import { validateQuery } from '../middleware/validate.js';
import { authMiddleware } from '../middleware/auth.js';
import { portfolioService } from '../services/portfolio.js';
import { wsServer } from '../websocket/server.js';

const router = new Router({ prefix: '/api/portfolio' });

/**
 * @route GET /api/portfolio
 * @desc 获取投资组合（账户信息 + 持仓）
 */
router.get('/', authMiddleware, async (ctx) => {
  const userId = ctx.state.user!.userId;

  const portfolio = portfolioService.getPortfolio(userId);

  ctx.body = {
    success: true,
    data: portfolio,
  };
});

/**
 * @route GET /api/portfolio/trades
 * @desc 获取最近交易记录
 */
router.get(
  '/trades',
  authMiddleware,
  validateQuery(
    z.object({
      limit: z.string().regex(/^\d+$/).optional().default('10'),
    })
  ),
  async (ctx) => {
    const userId = ctx.state.user!.userId;
    const { limit } = ctx.query as { limit: string };

    const trades = portfolioService.getRecentTrades(userId, parseInt(limit, 10));

    ctx.body = {
      success: true,
      data: trades,
    };
  }
);

/**
 * @route GET /api/portfolio/prices
 * @desc 获取当前市场价格（从行情模拟器）
 */
router.get('/prices', authMiddleware, async (ctx) => {
  const userId = ctx.state.user!.userId;
  const portfolio = portfolioService.getPortfolio(userId);

  // 返回持仓对应的当前价格
  const prices = portfolio.positions.map((p) => ({
    symbol: p.symbol,
    currentPrice: p.currentPrice,
    avgPrice: p.avgPrice,
    pnl: p.pnl,
    pnlPercent: p.pnlPercent,
  }));

  ctx.body = {
    success: true,
    data: prices,
  };
});

/**
 * @route POST /api/portfolio/subscribe
 * @desc 订阅账户实时更新（返回 WebSocket 连接信息）
 */
router.post('/subscribe', authMiddleware, async (ctx) => {
  const userId = ctx.state.user!.userId;

  // 初始化该用户的持仓数据（如果尚未初始化）
  const portfolio = portfolioService.getPortfolio(userId);
  if (portfolio.positions.length > 0) {
    const snapshots = portfolio.positions.map((p) => ({
      symbol: p.symbol,
      quantity: p.quantity,
      avgPrice: p.avgPrice,
    }));
    portfolioService.initUserPortfolio(userId, snapshots);
  }

  ctx.body = {
    success: true,
    data: {
      wsPath: '/ws',
      channels: [
        `account:${userId}`,
        ...portfolio.positions.map((p) => `market:${p.symbol}`),
      ],
    },
  };
});

export default router;
