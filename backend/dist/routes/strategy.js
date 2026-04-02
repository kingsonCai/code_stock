"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * 策略路由
 */
const koa_router_1 = __importDefault(require("koa-router"));
const zod_1 = require("zod");
const validate_js_1 = require("../middleware/validate.js");
const auth_js_1 = require("../middleware/auth.js");
const strategy_js_1 = require("../services/strategy.js");
const router = new koa_router_1.default({ prefix: '/api/strategies' });
// 策略 ID 参数验证
const strategyIdSchema = zod_1.z.object({
    id: zod_1.z.string().min(1, 'Strategy ID is required'),
});
// 创建策略验证
const createStrategySchema = zod_1.z.object({
    name: zod_1.z.string().min(1, 'Name is required').max(200),
    description: zod_1.z.string().max(2000).optional(),
    code: zod_1.z.string().min(1, 'Code is required'),
    status: zod_1.z.enum(['draft', 'published', 'archived']).optional(),
    isPublic: zod_1.z.boolean().optional(),
    config: zod_1.z.record(zod_1.z.unknown()).optional(),
});
// 更新策略验证
const updateStrategySchema = zod_1.z.object({
    name: zod_1.z.string().min(1).max(200).optional(),
    description: zod_1.z.string().max(2000).optional(),
    code: zod_1.z.string().min(1).optional(),
    status: zod_1.z.enum(['draft', 'published', 'archived']).optional(),
    isPublic: zod_1.z.boolean().optional(),
    config: zod_1.z.record(zod_1.z.unknown()).optional(),
});
// 查询参数验证
const querySchema = zod_1.z.object({
    page: zod_1.z.string().regex(/^\d+$/).optional().default('1'),
    pageSize: zod_1.z.string().regex(/^\d+$/).optional().default('20'),
    status: zod_1.z.enum(['draft', 'published', 'archived']).optional(),
});
/**
 * @route POST /api/strategies
 * @desc 创建新策略
 */
router.post('/', auth_js_1.authMiddleware, (0, validate_js_1.validateBody)(createStrategySchema), async (ctx) => {
    const userId = ctx.state.user.userId;
    const data = ctx.request.body;
    const strategy = await strategy_js_1.strategyService.create(userId, {
        userId,
        name: data.name,
        code: data.code,
        description: data.description,
        status: data.status ?? 'draft',
        isPublic: data.isPublic ?? false,
        config: data.config,
    });
    ctx.status = 201;
    ctx.body = {
        success: true,
        data: strategy,
    };
});
/**
 * @route GET /api/strategies
 * @desc 获取当前用户的策略列表
 */
router.get('/', auth_js_1.authMiddleware, (0, validate_js_1.validateQuery)(querySchema), async (ctx) => {
    const userId = ctx.state.user.userId;
    const { page, pageSize, status } = ctx.query;
    const result = await strategy_js_1.strategyService.getUserStrategies(userId, {
        status: status,
        page: parseInt(page, 10),
        pageSize: parseInt(pageSize, 10),
    });
    ctx.body = {
        success: true,
        data: result,
    };
});
/**
 * @route GET /api/strategies/public
 * @desc 获取公开策略列表
 */
router.get('/public', (0, validate_js_1.validateQuery)(zod_1.z.object({
    page: zod_1.z.string().regex(/^\d+$/).optional().default('1'),
    pageSize: zod_1.z.string().regex(/^\d+$/).optional().default('20'),
})), async (ctx) => {
    const { page, pageSize } = ctx.query;
    const result = await strategy_js_1.strategyService.getPublicStrategies({
        page: parseInt(page, 10),
        pageSize: parseInt(pageSize, 10),
    });
    ctx.body = {
        success: true,
        data: result,
    };
});
/**
 * @route GET /api/strategies/:id
 * @desc 获取策略详情
 */
router.get('/:id', auth_js_1.optionalAuthMiddleware, (0, validate_js_1.validateParams)(strategyIdSchema), async (ctx) => {
    const { id } = ctx.params;
    const userId = ctx.state.user?.userId;
    const strategy = await strategy_js_1.strategyService.getById(id, userId);
    ctx.body = {
        success: true,
        data: strategy,
    };
});
/**
 * @route PUT /api/strategies/:id
 * @desc 更新策略
 */
router.put('/:id', auth_js_1.authMiddleware, (0, validate_js_1.validateParams)(strategyIdSchema), (0, validate_js_1.validateBody)(updateStrategySchema), async (ctx) => {
    const userId = ctx.state.user.userId;
    const { id } = ctx.params;
    const data = ctx.request.body;
    const strategy = await strategy_js_1.strategyService.update(id, userId, {
        ...data,
        config: data.config,
    });
    ctx.body = {
        success: true,
        data: strategy,
    };
});
/**
 * @route DELETE /api/strategies/:id
 * @desc 删除策略
 */
router.delete('/:id', auth_js_1.authMiddleware, (0, validate_js_1.validateParams)(strategyIdSchema), async (ctx) => {
    const userId = ctx.state.user.userId;
    const { id } = ctx.params;
    await strategy_js_1.strategyService.delete(id, userId);
    ctx.body = {
        success: true,
        message: 'Strategy deleted successfully',
    };
});
/**
 * @route POST /api/strategies/:id/duplicate
 * @desc 复制策略
 */
router.post('/:id/duplicate', auth_js_1.authMiddleware, (0, validate_js_1.validateParams)(strategyIdSchema), async (ctx) => {
    const userId = ctx.state.user.userId;
    const { id } = ctx.params;
    const strategy = await strategy_js_1.strategyService.duplicate(id, userId);
    ctx.status = 201;
    ctx.body = {
        success: true,
        data: strategy,
    };
});
/**
 * @route POST /api/strategies/:id/publish
 * @desc 发布策略
 */
router.post('/:id/publish', auth_js_1.authMiddleware, (0, validate_js_1.validateParams)(strategyIdSchema), async (ctx) => {
    const userId = ctx.state.user.userId;
    const { id } = ctx.params;
    const strategy = await strategy_js_1.strategyService.publish(id, userId);
    ctx.body = {
        success: true,
        data: strategy,
    };
});
/**
 * @route POST /api/strategies/:id/archive
 * @desc 归档策略
 */
router.post('/:id/archive', auth_js_1.authMiddleware, (0, validate_js_1.validateParams)(strategyIdSchema), async (ctx) => {
    const userId = ctx.state.user.userId;
    const { id } = ctx.params;
    const strategy = await strategy_js_1.strategyService.archive(id, userId);
    ctx.body = {
        success: true,
        data: strategy,
    };
});
exports.default = router;
//# sourceMappingURL=strategy.js.map