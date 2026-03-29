/**
 * 参数校验中间件
 */
import { Context, Next } from 'koa';
import { ZodSchema, ZodError } from 'zod';
import { BadRequestError } from './error.js';

type ValidationTarget = 'body' | 'query' | 'params';

/**
 * 创建 Zod 校验中间件
 */
export function validate(
  schema: ZodSchema,
  target: ValidationTarget = 'body'
) {
  return async (ctx: Context, next: Next) => {
    let data: unknown;

    switch (target) {
      case 'body':
        data = ctx.request.body;
        break;
      case 'query':
        data = ctx.query;
        break;
      case 'params':
        data = ctx.params;
        break;
    }

    try {
      const validated = schema.parse(data);
      // 将验证后的数据替换原始数据
      switch (target) {
        case 'body':
          ctx.request.body = validated;
          break;
        case 'query':
          ctx.query = validated as Record<string, string>;
          break;
        case 'params':
          ctx.params = validated as Record<string, string>;
          break;
      }
      await next();
    } catch (err) {
      if (err instanceof ZodError) {
        throw new BadRequestError(
          `Validation error: ${err.errors.map(e => e.message).join(', ')}`
        );
      }
      throw err;
    }
  };
}

/**
 * 校验请求体
 */
export function validateBody(schema: ZodSchema) {
  return validate(schema, 'body');
}

/**
 * 校验查询参数
 */
export function validateQuery(schema: ZodSchema) {
  return validate(schema, 'query');
}

/**
 * 校验路径参数
 */
export function validateParams(schema: ZodSchema) {
  return validate(schema, 'params');
}
