// Jest setup file
import { beforeAll, afterAll } from '@jest/globals';

// 设置测试环境变量
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret-key';
process.env.JWT_EXPIRES_IN = '1h';

// 增加超时时间
jest.setTimeout(30000);
