import dotenv from 'dotenv';
import path from 'path';
import { z } from 'zod';

// 加载环境变量
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

// 配置 Schema 验证
const configSchema = z.object({
  nodeEnv: z.enum(['development', 'test', 'production']).default('development'),
  port: z.number().default(3000),
  host: z.string().default('localhost'),

  jwt: z.object({
    secret: z.string().min(32),
    expiresIn: z.string().default('7d'),
    refreshExpiresIn: z.string().default('30d'),
  }),

  database: z.object({
    type: z.enum(['mongodb', 'postgresql']).default('mongodb'),
    mongo: z.object({
      uri: z.string(),
      dbName: z.string(),
    }),
    postgres: z.object({
      host: z.string(),
      port: z.number(),
      user: z.string(),
      password: z.string(),
      database: z.string(),
    }),
  }),

  redis: z.object({
    host: z.string(),
    port: z.number(),
  }),

  python: z.object({
    path: z.string().default('python3'),
    enginePath: z.string().default('../python-engine'),
  }),

  logLevel: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
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

export const config = loadConfig();
export type Config = z.infer<typeof configSchema>;
