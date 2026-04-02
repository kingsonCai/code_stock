"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.config = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
const zod_1 = require("zod");
// 加载环境变量
dotenv_1.default.config({ path: path_1.default.resolve(__dirname, '../../.env') });
// 配置 Schema 验证
const configSchema = zod_1.z.object({
    nodeEnv: zod_1.z.enum(['development', 'test', 'production']).default('development'),
    port: zod_1.z.number().default(3000),
    host: zod_1.z.string().default('localhost'),
    jwt: zod_1.z.object({
        secret: zod_1.z.string().min(32),
        expiresIn: zod_1.z.string().default('7d'),
        refreshExpiresIn: zod_1.z.string().default('30d'),
    }),
    database: zod_1.z.object({
        type: zod_1.z.enum(['mongodb', 'postgresql']).default('mongodb'),
        mongo: zod_1.z.object({
            uri: zod_1.z.string(),
            dbName: zod_1.z.string(),
        }),
        postgres: zod_1.z.object({
            host: zod_1.z.string(),
            port: zod_1.z.number(),
            user: zod_1.z.string(),
            password: zod_1.z.string(),
            database: zod_1.z.string(),
        }),
    }),
    redis: zod_1.z.object({
        host: zod_1.z.string(),
        port: zod_1.z.number(),
    }),
    python: zod_1.z.object({
        path: zod_1.z.string().default('python3'),
        enginePath: zod_1.z.string().default('../python-engine'),
    }),
    logLevel: zod_1.z.enum(['debug', 'info', 'warn', 'error']).default('info'),
});
// 解析并验证配置
function loadConfig() {
    const rawConfig = {
        nodeEnv: process.env.NODE_ENV,
        port: parseInt(process.env.PORT || '3000', 10),
        host: process.env.HOST,
        jwt: {
            secret: process.env.JWT_SECRET,
            expiresIn: process.env.JWT_EXPIRES_IN,
            refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN,
        },
        database: {
            type: process.env.DATABASE_TYPE,
            mongo: {
                uri: process.env.MONGO_URI,
                dbName: process.env.MONGO_DB_NAME,
            },
            postgres: {
                host: process.env.POSTGRES_HOST,
                port: parseInt(process.env.POSTGRES_PORT || '5432', 10),
                user: process.env.POSTGRES_USER,
                password: process.env.POSTGRES_PASSWORD,
                database: process.env.POSTGRES_DB,
            },
        },
        redis: {
            host: process.env.REDIS_HOST,
            port: parseInt(process.env.REDIS_PORT || '6379', 10),
        },
        python: {
            path: process.env.PYTHON_PATH,
            enginePath: process.env.PYTHON_ENGINE_PATH,
        },
        logLevel: process.env.LOG_LEVEL,
    };
    return configSchema.parse(rawConfig);
}
exports.config = loadConfig();
//# sourceMappingURL=index.js.map