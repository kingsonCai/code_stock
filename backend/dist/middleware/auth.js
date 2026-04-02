"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authMiddleware = authMiddleware;
exports.optionalAuthMiddleware = optionalAuthMiddleware;
exports.adminMiddleware = adminMiddleware;
exports.generateToken = generateToken;
exports.generateRefreshToken = generateRefreshToken;
exports.verifyToken = verifyToken;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const index_js_1 = require("../config/index.js");
/**
 * JWT 认证中间件
 */
async function authMiddleware(ctx, next) {
    const authHeader = ctx.get('Authorization');
    if (!authHeader) {
        ctx.throw(401, 'No authorization header');
    }
    if (!authHeader.startsWith('Bearer ')) {
        ctx.throw(401, 'Invalid authorization format. Expected: Bearer <token>');
    }
    const token = authHeader.slice(7);
    try {
        const payload = jsonwebtoken_1.default.verify(token, index_js_1.config.jwt.secret);
        ctx.state.user = payload;
        await next();
    }
    catch (err) {
        if (err instanceof jsonwebtoken_1.default.TokenExpiredError) {
            ctx.throw(401, 'Token expired');
        }
        else if (err instanceof jsonwebtoken_1.default.JsonWebTokenError) {
            ctx.throw(401, 'Invalid token');
        }
        throw err;
    }
}
/**
 * 可选认证中间件 - 不强制要求登录
 */
async function optionalAuthMiddleware(ctx, next) {
    const authHeader = ctx.get('Authorization');
    if (authHeader?.startsWith('Bearer ')) {
        const token = authHeader.slice(7);
        try {
            const payload = jsonwebtoken_1.default.verify(token, index_js_1.config.jwt.secret);
            ctx.state.user = payload;
        }
        catch {
            // 忽略错误，继续执行
        }
    }
    await next();
}
/**
 * 管理员权限中间件
 */
async function adminMiddleware(ctx, next) {
    if (!ctx.state.user) {
        ctx.throw(401, 'Unauthorized');
    }
    // 这里可以检查用户角色
    // 暂时简化实现
    await next();
}
/**
 * 生成 JWT Token
 */
function generateToken(payload) {
    return jsonwebtoken_1.default.sign(payload, index_js_1.config.jwt.secret, {
        expiresIn: index_js_1.config.jwt.expiresIn,
    });
}
/**
 * 生成刷新 Token
 */
function generateRefreshToken(payload) {
    return jsonwebtoken_1.default.sign(payload, index_js_1.config.jwt.secret, {
        expiresIn: index_js_1.config.jwt.refreshExpiresIn,
    });
}
/**
 * 验证 Token 并返回 payload
 */
function verifyToken(token) {
    try {
        return jsonwebtoken_1.default.verify(token, index_js_1.config.jwt.secret);
    }
    catch {
        return null;
    }
}
//# sourceMappingURL=auth.js.map