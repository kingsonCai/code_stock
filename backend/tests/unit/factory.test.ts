/**
 * DAO Factory 单元测试
 */
import { DAOFactory } from '../../src/dao/factory.js';
import { MongoRepository } from '../../src/dao/mongo.js';
import { PostgresRepository } from '../../src/dao/postgresql.js';

// 模拟连接模块
jest.mock('../../src/dao/connection.js', () => ({
  getMongoConnection: () => ({
    getDb: jest.fn(),
    getClient: jest.fn(),
  }),
  getPostgresConnection: () => ({
    getPool: jest.fn(),
  }),
}));

describe('DAOFactory', () => {
  beforeEach(() => {
    DAOFactory.clearCache();
  });

  describe('createRepository', () => {
    it('应该创建 MongoDB Repository', () => {
      DAOFactory.setDatabaseType('mongodb');
      const repo = DAOFactory.createRepository('users');

      expect(repo).toBeInstanceOf(MongoRepository);
    });

    it('应该创建 PostgreSQL Repository', () => {
      DAOFactory.setDatabaseType('postgresql');
      const repo = DAOFactory.createRepository('users');

      expect(repo).toBeInstanceOf(PostgresRepository);
    });

    it('应该缓存 Repository 实例', () => {
      DAOFactory.setDatabaseType('mongodb');
      const repo1 = DAOFactory.createRepository('users');
      const repo2 = DAOFactory.createRepository('users');

      expect(repo1).toBe(repo2);
    });

    it('不同表名应该返回不同的 Repository', () => {
      DAOFactory.setDatabaseType('mongodb');
      const userRepo = DAOFactory.createRepository('users');
      const strategyRepo = DAOFactory.createRepository('strategies');

      expect(userRepo).not.toBe(strategyRepo);
    });
  });

  describe('setDatabaseType', () => {
    it('切换数据库类型应该清除缓存', () => {
      DAOFactory.setDatabaseType('mongodb');
      const mongoRepo = DAOFactory.createRepository('users');

      DAOFactory.setDatabaseType('postgresql');
      const pgRepo = DAOFactory.createRepository('users');

      expect(mongoRepo).toBeInstanceOf(MongoRepository);
      expect(pgRepo).toBeInstanceOf(PostgresRepository);
      expect(mongoRepo).not.toBe(pgRepo);
    });
  });

  describe('getDatabaseType', () => {
    it('应该返回当前数据库类型', () => {
      DAOFactory.setDatabaseType('mongodb');
      expect(DAOFactory.getDatabaseType()).toBe('mongodb');

      DAOFactory.setDatabaseType('postgresql');
      expect(DAOFactory.getDatabaseType()).toBe('postgresql');
    });
  });
});
