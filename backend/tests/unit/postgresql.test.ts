/**
 * PostgreSQL Repository 单元测试
 * 使用模拟的 Pool 进行测试
 */
import { Pool, PoolClient, QueryResult } from 'pg';
import { PostgresRepository } from '../../src/dao/postgresql.js';
import { BaseEntity } from '../../src/dao/types.js';

// 测试实体接口
interface TestEntity extends BaseEntity {
  name: string;
  value: number;
  active?: boolean;
}

// 模拟 Pool
const mockPool = {
  query: jest.fn(),
  connect: jest.fn(),
  end: jest.fn(),
};

// 模拟 PoolClient
const mockClient = {
  query: jest.fn(),
  release: jest.fn(),
};

describe('PostgresRepository', () => {
  let repository: PostgresRepository<TestEntity>;

  beforeEach(() => {
    jest.clearAllMocks();

    // 创建 repository 并注入模拟的 pool
    repository = new (class extends PostgresRepository<TestEntity> {
      constructor() {
        super('test_entities');
        // @ts-ignore - 直接设置 mock pool
        this.pool = mockPool as unknown as Pool;
      }
    })();
  });

  describe('findById', () => {
    it('应该根据 id 查找实体', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: [{
          id: 'test-id-123',
          name: 'test',
          value: 100,
          active: true,
          created_at: new Date(),
          updated_at: new Date(),
        }],
        rowCount: 1,
      });

      const result = await repository.findById('test-id-123');

      expect(mockPool.query).toHaveBeenCalledWith(
        'SELECT * FROM test_entities WHERE id = $1',
        ['test-id-123']
      );
      expect(result).not.toBeNull();
      expect(result?.id).toBe('test-id-123');
      expect(result?.name).toBe('test');
    });

    it('找不到实体时应返回 null', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
      });

      const result = await repository.findById('non-existent');

      expect(result).toBeNull();
    });
  });

  describe('create', () => {
    it('应该创建实体并返回', async () => {
      const now = new Date();
      mockPool.query.mockResolvedValueOnce({
        rows: [{
          id: 'new-id',
          name: 'new-entity',
          value: 200,
          active: true,
          created_at: now,
          updated_at: now,
        }],
        rowCount: 1,
      });

      const result = await repository.create({
        name: 'new-entity',
        value: 200,
        active: true,
      });

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO test_entities'),
        expect.arrayContaining(['new-entity', 200, true])
      );
      expect(result.id).toBe('new-id');
      expect(result.name).toBe('new-entity');
    });
  });

  describe('update', () => {
    it('应该更新实体', async () => {
      const now = new Date();
      mockPool.query.mockResolvedValueOnce({
        rows: [{
          id: 'update-id',
          name: 'updated-name',
          value: 300,
          active: false,
          created_at: now,
          updated_at: now,
        }],
        rowCount: 1,
      });

      const result = await repository.update('update-id', {
        name: 'updated-name',
        active: false,
      });

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE test_entities'),
        expect.arrayContaining(['updated-name', false, expect.any(Date), 'update-id'])
      );
      expect(result?.name).toBe('updated-name');
      expect(result?.active).toBe(false);
    });

    it('更新不存在的实体应返回 null', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
      });

      const result = await repository.update('non-existent', { name: 'test' });

      expect(result).toBeNull();
    });
  });

  describe('delete', () => {
    it('应该删除实体并返回 true', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: [],
        rowCount: 1,
      });

      const result = await repository.delete('delete-id');

      expect(mockPool.query).toHaveBeenCalledWith(
        'DELETE FROM test_entities WHERE id = $1',
        ['delete-id']
      );
      expect(result).toBe(true);
    });

    it('删除不存在的实体应返回 false', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
      });

      const result = await repository.delete('non-existent');

      expect(result).toBe(false);
    });
  });

  describe('count', () => {
    it('应该返回实体数量', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: [{ count: '42' }],
        rowCount: 1,
      });

      const result = await repository.count({ active: true });

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT COUNT(*)'),
        [true]
      );
      expect(result).toBe(42);
    });
  });

  describe('withTransaction', () => {
    it('应该正确执行事务', async () => {
      mockPool.connect.mockResolvedValue(mockClient);
      mockClient.query.mockResolvedValue({ rows: [], rowCount: 0 });

      const result = await repository.withTransaction(async (client) => {
        await client.query('INSERT INTO test VALUES (1)');
        return 'success';
      });

      expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
      expect(mockClient.query).toHaveBeenCalledWith('INSERT INTO test VALUES (1)');
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
      expect(mockClient.release).toHaveBeenCalled();
      expect(result).toBe('success');
    });

    it('事务失败应该回滚', async () => {
      mockPool.connect.mockResolvedValue(mockClient);
      mockClient.query.mockImplementation((sql: string) => {
        if (sql.includes('INSERT')) {
          return Promise.reject(new Error('Insert failed'));
        }
        return Promise.resolve({ rows: [], rowCount: 0 });
      });

      await expect(
        repository.withTransaction(async (client) => {
          await client.query('INSERT INTO test VALUES (1)');
        })
      ).rejects.toThrow('Insert failed');

      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
      expect(mockClient.release).toHaveBeenCalled();
    });
  });

  describe('字段转换', () => {
    it('应该正确转换驼峰命名为蛇形命名', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: [{
          id: 'test-id',
          user_id: 'user-123',  // 蛇形命名
          created_at: new Date(),
          updated_at: new Date(),
        }],
        rowCount: 1,
      });

      interface EntityWithCamelCase extends BaseEntity {
        userId: string;
      }

      const repo = new (class extends PostgresRepository<EntityWithCamelCase> {
        constructor() {
          super('test');
          // @ts-ignore
          this.pool = mockPool;
        }
      })();

      const result = await repo.findById('test-id');

      expect(result?.userId).toBe('user-123');
    });
  });
});
