"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validate = validate;
exports.validateBody = validateBody;
exports.validateQuery = validateQuery;
exports.validateParams = validateParams;
const zod_1 = require("zod");
const error_js_1 = require("./error.js");
/**
 * 创建 Zod 校验中间件
 */
function validate(schema, target = 'body') {
    return async (ctx, next) => {
        let data;
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
                    ctx.query = validated;
                    break;
                case 'params':
                    ctx.params = validated;
                    break;
            }
            await next();
        }
        catch (err) {
            if (err instanceof zod_1.ZodError) {
                throw new error_js_1.BadRequestError(`Validation error: ${err.errors.map(e => e.message).join(', ')}`);
            }
            throw err;
        }
    };
}
/**
 * 校验请求体
 */
function validateBody(schema) {
    return validate(schema, 'body');
}
/**
 * 校验查询参数
 */
function validateQuery(schema) {
    return validate(schema, 'query');
}
/**
 * 校验路径参数
 */
function validateParams(schema) {
    return validate(schema, 'params');
}
//# sourceMappingURL=validate.js.map