"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.logger = void 0;
const winston_1 = __importDefault(require("winston"));
const index_js_1 = require("../config/index.js");
const { combine, timestamp, printf, colorize, json } = winston_1.default.format;
// 自定义日志格式
const customFormat = printf(({ level, message, timestamp, ...metadata }) => {
    let msg = `${timestamp} [${level}]: ${message}`;
    if (Object.keys(metadata).length > 0) {
        msg += ` ${JSON.stringify(metadata)}`;
    }
    return msg;
});
// 创建 logger 实例
exports.logger = winston_1.default.createLogger({
    level: 'info', // 全局日志级别，确保 info 及以上级别日志被记录
    format: combine(timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }), json()),
    transports: [
        // 错误日志单独文件
        new winston_1.default.transports.File({
            filename: 'logs/error.log',
            level: 'error',
        }),
        // 所有日志，级别由环境变量控制
        new winston_1.default.transports.File({
            filename: 'logs/combined.log',
            level: index_js_1.config.logLevel,
        }),
    ],
});
// 始终添加控制台输出（开发和生产环境）
exports.logger.add(new winston_1.default.transports.Console({
    level: 'info', // 控制台输出 info 及以上级别的日志
    format: combine(colorize(), timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }), customFormat),
}));
exports.default = exports.logger;
//# sourceMappingURL=logger.js.map