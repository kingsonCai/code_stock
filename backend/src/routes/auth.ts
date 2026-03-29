/**
 * 认证路由
 */
import Router from 'koa-router';
import { z } from 'zod';
import { validateBody } from '../middleware/validate.js';
import { authMiddleware } from '../middleware/auth.js';
import { userService } from '../services/user.js';

const router = new Router({ prefix: '/api/auth' });

// 注册请求验证
const registerSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  name: z.string().min(2, 'Name must be at least 2 characters').max(100),
});

// 登录请求验证
const loginSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(1, 'Password is required'),
});

// 修改密码验证
const changePasswordSchema = z.object({
  oldPassword: z.string().min(1, 'Old password is required'),
  newPassword: z.string().min(8, 'New password must be at least 8 characters'),
});

// 刷新 Token 验证
const refreshTokenSchema = z.object({
  // 可以从 body 或 header 获取
});

/**
 * @route POST /api/auth/register
 * @desc 用户注册
 */
router.post('/register', validateBody(registerSchema), async (ctx) => {
  const result = await userService.register(ctx.request.body as z.infer<typeof registerSchema>);

  ctx.status = 201;
  ctx.body = {
    success: true,
    data: result,
  };
});

/**
 * @route POST /api/auth/login
 * @desc 用户登录
 */
router.post('/login', validateBody(loginSchema), async (ctx) => {
  const result = await userService.login(ctx.request.body as z.infer<typeof loginSchema>);

  ctx.body = {
    success: true,
    data: result,
  };
});

/**
 * @route GET /api/auth/me
 * @desc 获取当前用户信息
 */
router.get('/me', authMiddleware, async (ctx) => {
  const userId = ctx.state.user!.userId;
  const user = await userService.getById(userId);

  ctx.body = {
    success: true,
    data: user,
  };
});

/**
 * @route PUT /api/auth/password
 * @desc 修改密码
 */
router.put('/password', authMiddleware, validateBody(changePasswordSchema), async (ctx) => {
  const userId = ctx.state.user!.userId;
  const { oldPassword, newPassword } = ctx.request.body as z.infer<typeof changePasswordSchema>;

  await userService.changePassword(userId, oldPassword, newPassword);

  ctx.body = {
    success: true,
    message: 'Password changed successfully',
  };
});

/**
 * @route POST /api/auth/refresh
 * @desc 刷新 Token
 */
router.post('/refresh', authMiddleware, async (ctx) => {
  const userId = ctx.state.user!.userId;
  const tokens = await userService.refreshToken(userId);

  ctx.body = {
    success: true,
    data: tokens,
  };
});

/**
 * @route POST /api/auth/logout
 * @desc 用户登出（客户端清除 token）
 */
router.post('/logout', authMiddleware, async (ctx) => {
  // JWT 是无状态的，登出只需客户端清除 token
  // 如果需要服务端失效，可以使用 Redis 黑名单

  ctx.body = {
    success: true,
    message: 'Logged out successfully',
  };
});

export default router;
