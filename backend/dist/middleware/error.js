"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConflictError = exports.NotFoundError = exports.ForbiddenError = exports.UnauthorizedError = exports.BadRequestError = exports.HttpError = void 0;
exports.errorHandler = errorHandler;
exports.notFoundHandler = notFoundHandler;
const zod_1 = require("zod");
const logger_js_1 = require("../config/logger.js");
/**
 * 全局错误处理中间件
 */
async function errorHandler(ctx, next) {
    try {
        await next();
    }
    catch (err) {
        const error = err;
        // 记录错误日志
        logger_js_1.logger.error('Request error', {
            url: ctx.url,
            method: ctx.method,
            status: error.status || error.statusCode || 500,
            message: error.message,
            stack: error.stack,
        });
        // 确定状态码
        let status = error.status || error.statusCode || 500;
        // 构建错误响应
        const response = {
            status,
            message: error.message || 'Internal Server Error',
        };
        // Zod 验证错误
        if (err instanceof zod_1.ZodError) {
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
async function notFoundHandler(ctx) {
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
class HttpError extends Error {
    status;
    constructor(status, message) {
        super(message);
        this.status = status;
        this.name = 'HttpError';
    }
}
exports.HttpError = HttpError;
class BadRequestError extends HttpError {
    constructor(message = 'Bad Request') {
        super(400, message);
    }
}
exports.BadRequestError = BadRequestError;
class UnauthorizedError extends HttpError {
    constructor(message = 'Unauthorized') {
        super(401, message);
    }
}
exports.UnauthorizedError = UnauthorizedError;
class ForbiddenError extends HttpError {
    constructor(message = 'Forbidden') {
        super(403, message);
    }
}
exports.ForbiddenError = ForbiddenError;
class NotFoundError extends HttpError {
    constructor(message = 'Not Found') {
        super(404, message);
    }
}
exports.NotFoundError = NotFoundError;
class ConflictError extends HttpError {
    constructor(message = 'Conflict') {
        super(409, message);
    }
}
exports.ConflictError = ConflictError;
//# sourceMappingURL=error.js.map