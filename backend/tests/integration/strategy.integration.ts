/**
 * 策略 API 集成测试
 */
import request from 'supertest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { MongoClient } from 'mongodb';
import { createApp } from '../../src/app.js';
import { DAOFactory } from '../../src/dao/factory.js';
import { Koa } from 'koa';

describe('Strategy API Integration Tests', () => {
  let app: Koa;
  let mongoServer: MongoMemoryServer;
  let mongoClient: MongoClient;
  let authToken: string;
  let userId: string;

  const testUser = {
    email: 'strategy@test.com',
    password: 'password123',
    name: 'Strategy User',
  };

  const sampleStrategy = {
    name: 'MA Crossover',
    description: 'Simple moving average crossover strategy',
    code: `
def initialize(context):
    context.symbol = 'AAPL'
    context.fast_ma = 10
    context.slow_ma = 20

def handle_data(context, data):
    # Strategy logic here
    pass
    `,
    status: 'draft',
    isPublic: false,
    config: {
      symbols: ['AAPL'],
      timeframe: '1d',
    },
  };

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

    DAOFactory.setDatabaseType('mongodb');
    app = createApp();
  });

  afterAll(async () => {
    await mongoClient.close();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    // 清空集合并注册用户
    await mongoClient.db('test_db').collection('strategies').deleteMany({});

    const response = await request(app.callback())
      .post('/api/auth/register')
      .send(testUser);

    authToken = response.body.data.token;
    userId = response.body.data.user.id;
  });

  describe('POST /api/strategies', () => {
    it('应该成功创建策略', async () => {
      const response = await request(app.callback())
        .post('/api/strategies')
        .set('Authorization', `Bearer ${authToken}`)
        .send(sampleStrategy);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe(sampleStrategy.name);
      expect(response.body.data.code).toBe(sampleStrategy.code);
      expect(response.body.data.userId).toBe(userId);
      expect(response.body.data.id).toBeDefined();
    });

    it('应该拒绝未认证用户', async () => {
      const response = await request(app.callback())
        .post('/api/strategies')
        .send(sampleStrategy);

      expect(response.status).toBe(401);
    });

    it('应该验证必填字段', async () => {
      const response = await request(app.callback())
        .post('/api/strategies')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Test',
          // 缺少 code
        });

      expect(response.status).toBe(400);
    });
  });

  describe('GET /api/strategies', () => {
    beforeEach(async () => {
      // 创建几个测试策略
      for (let i = 1; i <= 3; i++) {
        await request(app.callback())
          .post('/api/strategies')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            ...sampleStrategy,
            name: `Strategy ${i}`,
          });
      }
    });

    it('应该返回用户的策略列表', async () => {
      const response = await request(app.callback())
        .get('/api/strategies')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.data).toHaveLength(3);
      expect(response.body.data.total).toBe(3);
    });

    it('应该支持分页', async () => {
      const response = await request(app.callback())
        .get('/api/strategies?page=1&pageSize=2')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.data).toHaveLength(2);
      expect(response.body.data.page).toBe(1);
      expect(response.body.data.pageSize).toBe(2);
      expect(response.body.data.totalPages).toBe(2);
    });
  });

  describe('GET /api/strategies/:id', () => {
    let strategyId: string;

    beforeEach(async () => {
      const response = await request(app.callback())
        .post('/api/strategies')
        .set('Authorization', `Bearer ${authToken}`)
        .send(sampleStrategy);

      strategyId = response.body.data.id;
    });

    it('应该返回策略详情', async () => {
      const response = await request(app.callback())
        .get(`/api/strategies/${strategyId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.id).toBe(strategyId);
      expect(response.body.data.name).toBe(sampleStrategy.name);
    });

    it('应该拒绝访问他人的私有策略', async () => {
      // 注册另一个用户
      const otherUser = await request(app.callback())
        .post('/api/auth/register')
        .send({
          email: 'other@test.com',
          password: 'password123',
          name: 'Other User',
        });

      const otherToken = otherUser.body.data.token;

      const response = await request(app.callback())
        .get(`/api/strategies/${strategyId}`)
        .set('Authorization', `Bearer ${otherToken}`);

      expect(response.status).toBe(403);
    });
  });

  describe('PUT /api/strategies/:id', () => {
    let strategyId: string;

    beforeEach(async () => {
      const response = await request(app.callback())
        .post('/api/strategies')
        .set('Authorization', `Bearer ${authToken}`)
        .send(sampleStrategy);

      strategyId = response.body.data.id;
    });

    it('应该成功更新策略', async () => {
      const response = await request(app.callback())
        .put(`/api/strategies/${strategyId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Updated Strategy Name',
          description: 'Updated description',
        });

      expect(response.status).toBe(200);
      expect(response.body.data.name).toBe('Updated Strategy Name');
      expect(response.body.data.description).toBe('Updated description');
    });

    it('应该拒绝更新他人策略', async () => {
      const otherUser = await request(app.callback())
        .post('/api/auth/register')
        .send({
          email: 'other2@test.com',
          password: 'password123',
          name: 'Other User 2',
        });

      const otherToken = otherUser.body.data.token;

      const response = await request(app.callback())
        .put(`/api/strategies/${strategyId}`)
        .set('Authorization', `Bearer ${otherToken}`)
        .send({ name: 'Hacked' });

      expect(response.status).toBe(403);
    });
  });

  describe('DELETE /api/strategies/:id', () => {
    let strategyId: string;

    beforeEach(async () => {
      const response = await request(app.callback())
        .post('/api/strategies')
        .set('Authorization', `Bearer ${authToken}`)
        .send(sampleStrategy);

      strategyId = response.body.data.id;
    });

    it('应该成功删除策略', async () => {
      const response = await request(app.callback())
        .delete(`/api/strategies/${strategyId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      // 验证已删除
      const getResponse = await request(app.callback())
        .get(`/api/strategies/${strategyId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(getResponse.status).toBe(404);
    });
  });

  describe('POST /api/strategies/:id/duplicate', () => {
    let strategyId: string;

    beforeEach(async () => {
      const response = await request(app.callback())
        .post('/api/strategies')
        .set('Authorization', `Bearer ${authToken}`)
        .send(sampleStrategy);

      strategyId = response.body.data.id;
    });

    it('应该成功复制策略', async () => {
      const response = await request(app.callback())
        .post(`/api/strategies/${strategyId}/duplicate`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(201);
      expect(response.body.data.name).toBe(`${sampleStrategy.name} (Copy)`);
      expect(response.body.data.id).not.toBe(strategyId);
    });
  });
});
