/**
 * 参数校验中间件
 */
import { Context, Next } from 'koa';
import { ZodSchema } from 'zod';
type ValidationTarget = 'body' | 'query' | 'params';
/**
 * 创建 Zod 校验中间件
 */
export declare function validate(schema: ZodSchema, target?: ValidationTarget): (ctx: Context, next: Next) => Promise<void>;
/**
 * 校验请求体
 */
export declare function validateBody(schema: ZodSchema): (ctx: Context, next: Next) => Promise<void>;
/**
 * 校验查询参数
 */
export declare function validateQuery(schema: ZodSchema): (ctx: Context, next: Next) => Promise<void>;
/**
 * 校验路径参数
 */
export declare function validateParams(schema: ZodSchema): (ctx: Context, next: Next) => Promise<void>;
export {};
//# sourceMappingURL=validate.d.ts.map