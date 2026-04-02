/**
 * JWT 认证中间件
 */
import { Context, Next } from 'koa';
export interface JwtPayload {
    userId: string;
    email: string;
    iat: number;
    exp: number;
}
declare module 'koa' {
    interface Context {
        state: {
            user?: JwtPayload;
        };
    }
}
/**
 * JWT 认证中间件
 */
export declare function authMiddleware(ctx: Context, next: Next): Promise<void>;
/**
 * 可选认证中间件 - 不强制要求登录
 */
export declare function optionalAuthMiddleware(ctx: Context, next: Next): Promise<void>;
/**
 * 管理员权限中间件
 */
export declare function adminMiddleware(ctx: Context, next: Next): Promise<void>;
/**
 * 生成 JWT Token
 */
export declare function generateToken(payload: {
    userId: string;
    email: string;
}): string;
/**
 * 生成刷新 Token
 */
export declare function generateRefreshToken(payload: {
    userId: string;
    email: string;
}): string;
/**
 * 验证 Token 并返回 payload
 */
export declare function verifyToken(token: string): JwtPayload | null;
//# sourceMappingURL=auth.d.ts.map