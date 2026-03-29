/**
 * 认证 API 集成测试
 */
import request from 'supertest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { MongoClient } from 'mongodb';
import { createApp } from '../../src/app.js';
import { DAOFactory } from '../../src/dao/factory.js';
import { Koa } from 'koa';

describe('Auth API Integration Tests', () => {
  let app: Koa;
  let mongoServer: MongoMemoryServer;
  let mongoClient: MongoClient;

  beforeAll(async () => {
    // 启动内存 MongoDB
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();

    mongoClient = new MongoClient(uri);
    await mongoClient.connect();

    // 设置环境变量
    process.env.DATABASE_TYPE = 'mongodb';
    process.env.MONGO_URI = uri;
    process.env.MONGO_DB_NAME = 'test_db';
    process.env.JWT_SECRET = 'test-secret-key-for-integration-testing-32chars';
    process.env.NODE_ENV = 'test';

    // 配置 DAO 工厂
    DAOFactory.setDatabaseType('mongodb');

    // Mock 连接
    jest.mock('../../src/dao/connection.js', () => ({
      getMongoConnection: () => ({
        getDb: () => mongoClient.db('test_db'),
        getClient: () => mongoClient,
      }),
      initDatabase: jest.fn(),
      closeDatabase: jest.fn(),
    }));

    app = createApp();
  });

  afterAll(async () => {
    await mongoClient.close();
    await mongoServer.stop();
  });

  describe('POST /api/auth/register', () => {
    it('应该成功注册新用户', async () => {
      const response = await request(app.callback())
        .post('/api/auth/register')
        .send({
          email: 'newuser@test.com',
          password: 'password123',
          name: 'Test User',
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.user.email).toBe('newuser@test.com');
      expect(response.body.data.user.name).toBe('Test User');
      expect(response.body.data.token).toBeDefined();
      expect(response.body.data.refreshToken).toBeDefined();
      expect(response.body.data.user.passwordHash).toBeUndefined();
    });

    it('应该拒绝重复邮箱注册', async () => {
      // 先注册一个用户
      await request(app.callback())
        .post('/api/auth/register')
        .send({
          email: 'duplicate@test.com',
          password: 'password123',
          name: 'Duplicate User',
        });

      // 尝试使用相同邮箱注册
      const response = await request(app.callback())
        .post('/api/auth/register')
        .send({
          email: 'duplicate@test.com',
          password: 'password456',
          name: 'Another User',
        });

      expect(response.status).toBe(409);
      expect(response.body.success).toBe(false);
    });

    it('应该验证输入参数', async () => {
      const response = await request(app.callback())
        .post('/api/auth/register')
        .send({
          email: 'invalid-email',
          password: '123', // 太短
          name: '', // 空
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/auth/login', () => {
    const testUser = {
      email: 'loginuser@test.com',
      password: 'password123',
      name: 'Login User',
    };

    beforeEach(async () => {
      // 确保测试用户存在
      await request(app.callback())
        .post('/api/auth/register')
        .send(testUser);
    });

    it('应该成功登录', async () => {
      const response = await request(app.callback())
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password,
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.user.email).toBe(testUser.email);
      expect(response.body.data.token).toBeDefined();
    });

    it('应该拒绝错误密码', async () => {
      const response = await request(app.callback())
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: 'wrongpassword',
        });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    it('应该拒绝不存在的用户', async () => {
      const response = await request(app.callback())
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@test.com',
          password: 'password123',
        });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/auth/me', () => {
    let authToken: string;

    beforeEach(async () => {
      // 注册并获取 token
      const response = await request(app.callback())
        .post('/api/auth/register')
        .send({
          email: 'me@test.com',
          password: 'password123',
          name: 'Me User',
        });
      authToken = response.body.data.token;
    });

    it('应该返回当前用户信息', async () => {
      const response = await request(app.callback())
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.email).toBe('me@test.com');
    });

    it('应该拒绝无 token 的请求', async () => {
      const response = await request(app.callback())
        .get('/api/auth/me');

      expect(response.status).toBe(401);
    });

    it('应该拒绝无效 token', async () => {
      const response = await request(app.callback())
        .get('/api/auth/me')
        .set('Authorization', 'Bearer invalid-token');

      expect(response.status).toBe(401);
    });
  });

  describe('PUT /api/auth/password', () => {
    let authToken: string;
    const user = {
      email: 'changepwd@test.com',
      password: 'oldpassword123',
      name: 'Change Pwd User',
    };

    beforeEach(async () => {
      const response = await request(app.callback())
        .post('/api/auth/register')
        .send(user);
      authToken = response.body.data.token;
    });

    it('应该成功修改密码', async () => {
      const response = await request(app.callback())
        .put('/api/auth/password')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          oldPassword: user.password,
          newPassword: 'newpassword123',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      // 验证新密码可以登录
      const loginResponse = await request(app.callback())
        .post('/api/auth/login')
        .send({
          email: user.email,
          password: 'newpassword123',
        });

      expect(loginResponse.status).toBe(200);
    });

    it('应该拒绝错误的旧密码', async () => {
      const response = await request(app.callback())
        .put('/api/auth/password')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          oldPassword: 'wrongoldpassword',
          newPassword: 'newpassword123',
        });

      expect(response.status).toBe(401);
    });
  });
});
