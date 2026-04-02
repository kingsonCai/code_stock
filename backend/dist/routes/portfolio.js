"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * 投资组合路由
 */
const koa_router_1 = __importDefault(require("koa-router"));
const zod_1 = require("zod");
const validate_js_1 = require("../middleware/validate.js");
const auth_js_1 = require("../middleware/auth.js");
const portfolio_js_1 = require("../services/portfolio.js");
const router = new koa_router_1.default({ prefix: '/api/portfolio' });
/**
 * @route GET /api/portfolio
 * @desc 获取投资组合（账户信息 + 持仓）
 */
router.get('/', auth_js_1.authMiddleware, async (ctx) => {
    const userId = ctx.state.user.userId;
    const portfolio = portfolio_js_1.portfolioService.getPortfolio(userId);
    ctx.body = {
        success: true,
        data: portfolio,
    };
});
/**
 * @route GET /api/portfolio/trades
 * @desc 获取最近交易记录
 */
router.get('/trades', auth_js_1.authMiddleware, (0, validate_js_1.validateQuery)(zod_1.z.object({
    limit: zod_1.z.string().regex(/^\d+$/).optional().default('10'),
})), async (ctx) => {
    const userId = ctx.state.user.userId;
    const { limit } = ctx.query;
    const trades = portfolio_js_1.portfolioService.getRecentTrades(userId, parseInt(limit, 10));
    ctx.body = {
        success: true,
        data: trades,
    };
});
/**
 * @route GET /api/portfolio/prices
 * @desc 获取当前市场价格（从行情模拟器）
 */
router.get('/prices', auth_js_1.authMiddleware, async (ctx) => {
    const userId = ctx.state.user.userId;
    const portfolio = portfolio_js_1.portfolioService.getPortfolio(userId);
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
router.post('/subscribe', auth_js_1.authMiddleware, async (ctx) => {
    const userId = ctx.state.user.userId;
    // 初始化该用户的持仓数据（如果尚未初始化）
    const portfolio = portfolio_js_1.portfolioService.getPortfolio(userId);
    if (portfolio.positions.length > 0) {
        const snapshots = portfolio.positions.map((p) => ({
            symbol: p.symbol,
            quantity: p.quantity,
            avgPrice: p.avgPrice,
        }));
        portfolio_js_1.portfolioService.initUserPortfolio(userId, snapshots);
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
exports.default = router;
//# sourceMappingURL=portfolio.js.map