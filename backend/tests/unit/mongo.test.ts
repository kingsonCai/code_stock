/**
 * MongoDB Repository 单元测试
 */
import { MongoMemoryServer } from 'mongodb-memory-server';
import { MongoClient, Db } from 'mongodb';
import { MongoRepository } from '../../src/dao/mongo.js';
import { BaseEntity } from '../../src/dao/types.js';

// 测试实体接口
interface TestEntity extends BaseEntity {
  name: string;
  value: number;
  active?: boolean;
}

describe('MongoRepository', () => {
  let mongoServer: MongoMemoryServer;
  let mongoClient: MongoClient;
  let db: Db;
  let repository: MongoRepository<TestEntity>;

  beforeAll(async () => {
    // 启动内存 MongoDB
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();

    mongoClient = new MongoClient(uri);
    await mongoClient.connect();
    db = mongoClient.db('test_db');

    // Mock getMongoConnection
    jest.mock('../../src/dao/connection.js', () => ({
      getMongoConnection: () => ({
        getDb: () => db,
        getClient: () => mongoClient,
      }),
    }));
  });

  afterAll(async () => {
    await mongoClient.close();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    // 清空集合并创建新的 repository
    await db.collection('test_entities').deleteMany({});

    // 直接实例化，绕过 getMongoConnection
    repository = new (class extends MongoRepository<TestEntity> {
      constructor() {
        super('test_entities');
        // @ts-ignore - 直接设置 collection
        this.collection = db.collection('test_entities');
      }
    })();
  });

  describe('create', () => {
    it('应该创建实体并生成 id 和时间戳', async () => {
      const entity = await repository.create({
        name: 'test',
        value: 100,
        active: true,
      });

      expect(entity.id).toBeDefined();
      expect(entity.name).toBe('test');
      expect(entity.value).toBe(100);
      expect(entity.active).toBe(true);
      expect(entity.createdAt).toBeInstanceOf(Date);
      expect(entity.updatedAt).toBeInstanceOf(Date);
    });
  });

  describe('findById', () => {
    it('应该根据 id 查找实体', async () => {
      const created = await repository.create({ name: 'find-test', value: 1 });

      const found = await repository.findById(created.id);

      expect(found).not.toBeNull();
      expect(found?.id).toBe(created.id);
      expect(found?.name).toBe('find-test');
    });

    it('找不到实体时应返回 null', async () => {
      const found = await repository.findById('507f1f77bcf86cd799439011');
      expect(found).toBeNull();
    });
  });

  describe('findOne', () => {
    it('应该根据条件查询单个实体', async () => {
      await repository.create({ name: 'unique', value: 1 });
      await repository.create({ name: 'unique', value: 2 });

      const found = await repository.findOne({ name: 'unique' });

      expect(found).not.toBeNull();
      expect(found?.name).toBe('unique');
    });
  });

  describe('findMany', () => {
    beforeEach(async () => {
      await repository.create({ name: 'item1', value: 1, active: true });
      await repository.create({ name: 'item2', value: 2, active: true });
      await repository.create({ name: 'item3', value: 3, active: false });
    });

    it('应该查询所有匹配的实体', async () => {
      const items = await repository.findMany({ active: true });
      expect(items).toHaveLength(2);
    });

    it('应该支持分页查询', async () => {
      const items = await repository.findMany({}, { skip: 1, limit: 2 });
      expect(items).toHaveLength(2);
    });

    it('应该支持排序', async () => {
      const items = await repository.findMany({}, { sort: { value: -1 } });
      expect(items[0].value).toBe(3);
      expect(items[1].value).toBe(2);
    });
  });

  describe('update', () => {
    it('应该更新实体', async () => {
      const created = await repository.create({ name: 'original', value: 1 });

      const updated = await repository.update(created.id, { name: 'updated' });

      expect(updated).not.toBeNull();
      expect(updated?.name).toBe('updated');
      expect(updated?.value).toBe(1);
      expect(updated?.updatedAt.getTime()).toBeGreaterThanOrEqual(
        created.updatedAt.getTime()
      );
    });

    it('更新不存在的实体应返回 null', async () => {
      const updated = await repository.update('507f1f77bcf86cd799439011', {
        name: 'updated',
      });
      expect(updated).toBeNull();
    });
  });

  describe('delete', () => {
    it('应该删除实体', async () => {
      const created = await repository.create({ name: 'delete-me', value: 1 });

      const result = await repository.delete(created.id);

      expect(result).toBe(true);

      const found = await repository.findById(created.id);
      expect(found).toBeNull();
    });

    it('删除不存在的实体应返回 false', async () => {
      const result = await repository.delete('507f1f77bcf86cd799439011');
      expect(result).toBe(false);
    });
  });

  describe('count', () => {
    beforeEach(async () => {
      await repository.create({ name: 'count1', value: 1 });
      await repository.create({ name: 'count2', value: 2 });
      await repository.create({ name: 'count3', value: 3 });
    });

    it('应该返回匹配条件的实体数量', async () => {
      const count = await repository.count({});
      expect(count).toBe(3);
    });

    it('应该支持条件计数', async () => {
      const count = await repository.count({ name: 'count1' });
      expect(count).toBe(1);
    });
  });

  describe('paginate', () => {
    beforeEach(async () => {
      for (let i = 1; i <= 25; i++) {
        await repository.create({ name: `item${i}`, value: i });
      }
    });

    it('应该返回分页结果', async () => {
      const result = await repository.paginate({}, 1, 10);

      expect(result.data).toHaveLength(10);
      expect(result.total).toBe(25);
      expect(result.page).toBe(1);
      expect(result.pageSize).toBe(10);
      expect(result.totalPages).toBe(3);
    });

    it('应该正确处理最后一页', async () => {
      const result = await repository.paginate({}, 3, 10);
      expect(result.data).toHaveLength(5);
    });
  });

  describe('createMany', () => {
    it('应该批量创建实体', async () => {
      const entities = await repository.createMany([
        { name: 'batch1', value: 1 },
        { name: 'batch2', value: 2 },
        { name: 'batch3', value: 3 },
      ]);

      expect(entities).toHaveLength(3);
      entities.forEach(entity => {
        expect(entity.id).toBeDefined();
      });
    });
  });

  describe('updateMany', () => {
    beforeEach(async () => {
      await repository.create({ name: 'same', value: 1, active: true });
      await repository.create({ name: 'same', value: 2, active: true });
      await repository.create({ name: 'other', value: 3, active: true });
    });

    it('应该批量更新实体', async () => {
      const count = await repository.updateMany({ name: 'same' }, { active: false });
      expect(count).toBe(2);

      const items = await repository.findMany({ name: 'same' });
      items.forEach(item => {
        expect(item.active).toBe(false);
      });
    });
  });

  describe('deleteMany', () => {
    beforeEach(async () => {
      await repository.create({ name: 'delete', value: 1 });
      await repository.create({ name: 'delete', value: 2 });
      await repository.create({ name: 'keep', value: 3 });
    });

    it('应该批量删除实体', async () => {
      const count = await repository.deleteMany({ name: 'delete' });
      expect(count).toBe(2);

      const remaining = await repository.findMany({});
      expect(remaining).toHaveLength(1);
      expect(remaining[0].name).toBe('keep');
    });
  });
});
