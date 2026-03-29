/**
 * 错误处理中间件
 */
import { Context, Next } from 'koa';
import { ZodError } from 'zod';
import { logger } from '../config/logger.js';

export interface ApiError {
  status: number;
  message: string;
  details?: unknown;
  stack?: string;
}

/**
 * 全局错误处理中间件
 */
export async function errorHandler(ctx: Context, next: Next) {
  try {
    await next();
  } catch (err: unknown) {
    const error = err as Error & { status?: number; statusCode?: number };

    // 记录错误日志
    logger.error('Request error', {
      url: ctx.url,
      method: ctx.method,
      status: error.status || error.statusCode || 500,
      message: error.message,
      stack: error.stack,
    });

    // 确定状态码
    let status = error.status || error.statusCode || 500;

    // 构建错误响应
    const response: ApiError = {
      status,
      message: error.message || 'Internal Server Error',
    };

    // Zod 验证错误
    if (err instanceof ZodError) {
      status = 400;
      response.status = status;
      response.message = 'Validation error';
      response.details = err.errors;
    }

    // 开发环境返回堆栈信息
    if (process.env.NODE_ENV === 'development') {
      response.stack = error.stack;
    }

    ctx.status = status;
    ctx.body = {
      success: false,
      error: response,
    };
  }
}

/**
 * 404 处理中间件
 */
export async function notFoundHandler(ctx: Context) {
  ctx.status = 404;
  ctx.body = {
    success: false,
    error: {
      status: 404,
      message: `Not Found: ${ctx.method} ${ctx.url}`,
    },
  };
}

/**
 * 自定义错误类
 */
export class HttpError extends Error {
  constructor(
    public status: number,
    message: string
  ) {
    super(message);
    this.name = 'HttpError';
  }
}

export class BadRequestError extends HttpError {
  constructor(message: string = 'Bad Request') {
    super(400, message);
  }
}

export class UnauthorizedError extends HttpError {
  constructor(message: string = 'Unauthorized') {
    super(401, message);
  }
}

export class ForbiddenError extends HttpError {
  constructor(message: string = 'Forbidden') {
    super(403, message);
  }
}

export class NotFoundError extends HttpError {
  constructor(message: string = 'Not Found') {
    super(404, message);
  }
}

export class ConflictError extends HttpError {
  constructor(message: string = 'Conflict') {
    super(409, message);
  }
}
