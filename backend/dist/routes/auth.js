"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * 认证路由
 */
const koa_router_1 = __importDefault(require("koa-router"));
const zod_1 = require("zod");
const validate_js_1 = require("../middleware/validate.js");
const auth_js_1 = require("../middleware/auth.js");
const user_js_1 = require("../services/user.js");
const router = new koa_router_1.default({ prefix: '/api/auth' });
// 注册请求验证
const registerSchema = zod_1.z.object({
    email: zod_1.z.string().email('Invalid email format'),
    password: zod_1.z.string().min(8, 'Password must be at least 8 characters'),
    name: zod_1.z.string().min(2, 'Name must be at least 2 characters').max(100),
});
// 登录请求验证
const loginSchema = zod_1.z.object({
    email: zod_1.z.string().email('Invalid email format'),
    password: zod_1.z.string().min(1, 'Password is required'),
});
// 修改密码验证
const changePasswordSchema = zod_1.z.object({
    oldPassword: zod_1.z.string().min(1, 'Old password is required'),
    newPassword: zod_1.z.string().min(8, 'New password must be at least 8 characters'),
});
// 刷新 Token 验证
const refreshTokenSchema = zod_1.z.object({
// 可以从 body 或 header 获取
});
/**
 * @route POST /api/auth/register
 * @desc 用户注册
 */
router.post('/register', (0, validate_js_1.validateBody)(registerSchema), async (ctx) => {
    const result = await user_js_1.userService.register(ctx.request.body);
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
router.post('/login', (0, validate_js_1.validateBody)(loginSchema), async (ctx) => {
    const result = await user_js_1.userService.login(ctx.request.body);
    ctx.body = {
        success: true,
        data: result,
    };
});
/**
 * @route GET /api/auth/me
 * @desc 获取当前用户信息
 */
router.get('/me', auth_js_1.authMiddleware, async (ctx) => {
    const userId = ctx.state.user.userId;
    const user = await user_js_1.userService.getById(userId);
    ctx.body = {
        success: true,
        data: user,
    };
});
/**
 * @route PUT /api/auth/password
 * @desc 修改密码
 */
router.put('/password', auth_js_1.authMiddleware, (0, validate_js_1.validateBody)(changePasswordSchema), async (ctx) => {
    const userId = ctx.state.user.userId;
    const { oldPassword, newPassword } = ctx.request.body;
    await user_js_1.userService.changePassword(userId, oldPassword, newPassword);
    ctx.body = {
        success: true,
        message: 'Password changed successfully',
    };
});
/**
 * @route POST /api/auth/refresh
 * @desc 刷新 Token
 */
router.post('/refresh', auth_js_1.authMiddleware, async (ctx) => {
    const userId = ctx.state.user.userId;
    const tokens = await user_js_1.userService.refreshToken(userId);
    ctx.body = {
        success: true,
        data: tokens,
    };
});
/**
 * @route POST /api/auth/logout
 * @desc 用户登出（客户端清除 token）
 */
router.post('/logout', auth_js_1.authMiddleware, async (ctx) => {
    // JWT 是无状态的，登出只需客户端清除 token
    // 如果需要服务端失效，可以使用 Redis 黑名单
    ctx.body = {
        success: true,
        message: 'Logged out successfully',
    };
});
exports.default = router;
//# sourceMappingURL=auth.js.map