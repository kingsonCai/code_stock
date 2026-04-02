/**
 * JWT 认证中间件
 */
import { Context, Next } from 'koa';
import jwt from 'jsonwebtoken';
import { config } from '../config/index.js';

export interface JwtPayload {
  userId: string;
  email: string;
  iat: number;
  exp: number;
}

// 扩展 Koa Context
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
export async function authMiddleware(ctx: Context, next: Next) {
  const authHeader = ctx.get('Authorization');

  if (!authHeader) {
    ctx.throw(401, 'No authorization header');
  }

  if (!authHeader.startsWith('Bearer ')) {
    ctx.throw(401, 'Invalid authorization format. Expected: Bearer <token>');
  }

  const token = authHeader.slice(7);

  try {
    const payload = jwt.verify(token, config.jwt.secret) as JwtPayload;
    ctx.state.user = payload;
    await next();
  } catch (err) {
    if (err instanceof jwt.TokenExpiredError) {
      ctx.throw(401, 'Token expired');
    } else if (err instanceof jwt.JsonWebTokenError) {
      ctx.throw(401, 'Invalid token');
    }
    throw err;
  }
}

/**
 * 可选认证中间件 - 不强制要求登录
 */
export async function optionalAuthMiddleware(ctx: Context, next: Next) {
  const authHeader = ctx.get('Authorization');

  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7);

    try {
      const payload = jwt.verify(token, config.jwt.secret) as JwtPayload;
      ctx.state.user = payload;
    } catch {
      // 忽略错误，继续执行
    }
  }

  await next();
}

/**
 * 管理员权限中间件
 */
export async function adminMiddleware(ctx: Context, next: Next) {
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
export function generateToken(payload: { userId: string; email: string }): string {
  return jwt.sign(payload, config.jwt.secret, {
    expiresIn: config.jwt.expiresIn as unknown as number,
  });
}

/**
 * 生成刷新 Token
 */
export function generateRefreshToken(payload: { userId: string; email: string }): string {
  return jwt.sign(payload, config.jwt.secret, {
    expiresIn: config.jwt.refreshExpiresIn as unknown as number,
  });
}

/**
 * 验证 Token 并返回 payload
 */
export function verifyToken(token: string): JwtPayload | null {
  try {
    return jwt.verify(token, config.jwt.secret) as JwtPayload;
  } catch {
    return null;
  }
}
