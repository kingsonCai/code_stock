/**
 * 错误处理中间件
 */
import { Context, Next } from 'koa';
export interface ApiError {
    status: number;
    message: string;
    details?: unknown;
    stack?: string;
}
/**
 * 全局错误处理中间件
 */
export declare function errorHandler(ctx: Context, next: Next): Promise<void>;
/**
 * 404 处理中间件
 */
export declare function notFoundHandler(ctx: Context): Promise<void>;
/**
 * 自定义错误类
 */
export declare class HttpError extends Error {
    status: number;
    constructor(status: number, message: string);
}
export declare class BadRequestError extends HttpError {
    constructor(message?: string);
}
export declare class UnauthorizedError extends HttpError {
    constructor(message?: string);
}
export declare class ForbiddenError extends HttpError {
    constructor(message?: string);
}
export declare class NotFoundError extends HttpError {
    constructor(message?: string);
}
export declare class ConflictError extends HttpError {
    constructor(message?: string);
}
//# sourceMappingURL=error.d.ts.map