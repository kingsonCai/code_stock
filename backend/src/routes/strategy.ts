/**
 * 策略路由
 */
import Router from 'koa-router';
import { z } from 'zod';
import { validateBody, validateQuery, validateParams } from '../middleware/validate.js';
import { authMiddleware, optionalAuthMiddleware } from '../middleware/auth.js';
import { strategyService } from '../services/strategy.js';
import { StrategyConfig } from '../dao/repositories/strategy.js';

const router = new Router({ prefix: '/api/strategies' });

// 策略 ID 参数验证
const strategyIdSchema = z.object({
  id: z.string().min(1, 'Strategy ID is required'),
});

// 创建策略验证
const createStrategySchema = z.object({
  name: z.string().min(1, 'Name is required').max(200),
  description: z.string().max(2000).optional(),
  code: z.string().min(1, 'Code is required'),
  status: z.enum(['draft', 'published', 'archived']).optional(),
  isPublic: z.boolean().optional(),
  config: z.record(z.unknown()).optional(),
});

// 更新策略验证
const updateStrategySchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).optional(),
  code: z.string().min(1).optional(),
  status: z.enum(['draft', 'published', 'archived']).optional(),
  isPublic: z.boolean().optional(),
  config: z.record(z.unknown()).optional(),
});

// 查询参数验证
const querySchema = z.object({
  page: z.string().regex(/^\d+$/).optional().default('1'),
  pageSize: z.string().regex(/^\d+$/).optional().default('20'),
  status: z.enum(['draft', 'published', 'archived']).optional(),
});

/**
 * @route POST /api/strategies
 * @desc 创建新策略
 */
router.post(
  '/',
  authMiddleware,
  validateBody(createStrategySchema),
  async (ctx) => {
    const userId = ctx.state.user!.userId;
    const data = ctx.request.body as z.infer<typeof createStrategySchema>;

    const strategy = await strategyService.create(userId, {
      ...data,
      config: data.config as StrategyConfig,
    });

    ctx.status = 201;
    ctx.body = {
      success: true,
      data: strategy,
    };
  }
);

/**
 * @route GET /api/strategies
 * @desc 获取当前用户的策略列表
 */
router.get(
  '/',
  authMiddleware,
  validateQuery(querySchema),
  async (ctx) => {
    const userId = ctx.state.user!.userId;
    const { page, pageSize, status } = ctx.query as z.infer<typeof querySchema>;

    const result = await strategyService.getUserStrategies(userId, {
      status: status as 'draft' | 'published' | 'archived' | undefined,
      page: parseInt(page, 10),
      pageSize: parseInt(pageSize, 10),
    });

    ctx.body = {
      success: true,
      data: result,
    };
  }
);

/**
 * @route GET /api/strategies/public
 * @desc 获取公开策略列表
 */
router.get(
  '/public',
  validateQuery(z.object({
    page: z.string().regex(/^\d+$/).optional().default('1'),
    pageSize: z.string().regex(/^\d+$/).optional().default('20'),
  })),
  async (ctx) => {
    const { page, pageSize } = ctx.query as { page: string; pageSize: string };

    const result = await strategyService.getPublicStrategies({
      page: parseInt(page, 10),
      pageSize: parseInt(pageSize, 10),
    });

    ctx.body = {
      success: true,
      data: result,
    };
  }
);

/**
 * @route GET /api/strategies/:id
 * @desc 获取策略详情
 */
router.get(
  '/:id',
  optionalAuthMiddleware,
  validateParams(strategyIdSchema),
  async (ctx) => {
    const { id } = ctx.params;
    const userId = ctx.state.user?.userId;

    const strategy = await strategyService.getById(id, userId);

    ctx.body = {
      success: true,
      data: strategy,
    };
  }
);

/**
 * @route PUT /api/strategies/:id
 * @desc 更新策略
 */
router.put(
  '/:id',
  authMiddleware,
  validateParams(strategyIdSchema),
  validateBody(updateStrategySchema),
  async (ctx) => {
    const userId = ctx.state.user!.userId;
    const { id } = ctx.params;
    const data = ctx.request.body as z.infer<typeof updateStrategySchema>;

    const strategy = await strategyService.update(id, userId, {
      ...data,
      config: data.config as StrategyConfig | undefined,
    });

    ctx.body = {
      success: true,
      data: strategy,
    };
  }
);

/**
 * @route DELETE /api/strategies/:id
 * @desc 删除策略
 */
router.delete(
  '/:id',
  authMiddleware,
  validateParams(strategyIdSchema),
  async (ctx) => {
    const userId = ctx.state.user!.userId;
    const { id } = ctx.params;

    await strategyService.delete(id, userId);

    ctx.body = {
      success: true,
      message: 'Strategy deleted successfully',
    };
  }
);

/**
 * @route POST /api/strategies/:id/duplicate
 * @desc 复制策略
 */
router.post(
  '/:id/duplicate',
  authMiddleware,
  validateParams(strategyIdSchema),
  async (ctx) => {
    const userId = ctx.state.user!.userId;
    const { id } = ctx.params;

    const strategy = await strategyService.duplicate(id, userId);

    ctx.status = 201;
    ctx.body = {
      success: true,
      data: strategy,
    };
  }
);

/**
 * @route POST /api/strategies/:id/publish
 * @desc 发布策略
 */
router.post(
  '/:id/publish',
  authMiddleware,
  validateParams(strategyIdSchema),
  async (ctx) => {
    const userId = ctx.state.user!.userId;
    const { id } = ctx.params;

    const strategy = await strategyService.publish(id, userId);

    ctx.body = {
      success: true,
      data: strategy,
    };
  }
);

/**
 * @route POST /api/strategies/:id/archive
 * @desc 归档策略
 */
router.post(
  '/:id/archive',
  authMiddleware,
  validateParams(strategyIdSchema),
  async (ctx) => {
    const userId = ctx.state.user!.userId;
    const { id } = ctx.params;

    const strategy = await strategyService.archive(id, userId);

    ctx.body = {
      success: true,
      data: strategy,
    };
  }
);

export default router;
