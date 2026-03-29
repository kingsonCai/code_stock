/**
 * DAO 工厂 - 根据配置创建对应的 Repository
 */
import { IRepository, BaseEntity, DatabaseType } from './types.js';
import { MongoRepository } from './mongo.js';
import { PostgresRepository } from './postgresql.js';
import { config } from '../config/index.js';

// Repository 缓存
const repositoryCache = new Map<string, IRepository<any>>();

/**
 * DAO 工厂类
 */
export class DAOFactory {
  private static databaseType: DatabaseType = config.database.type;

  /**
   * 配置数据库类型
   */
  static setDatabaseType(type: DatabaseType): void {
    this.databaseType = type;
    // 清除缓存
    repositoryCache.clear();
  }

  /**
   * 获取当前数据库类型
   */
  static getDatabaseType(): DatabaseType {
    return this.databaseType;
  }

  /**
   * 创建或获取 Repository 实例
   */
  static createRepository<T extends BaseEntity>(
    tableName: string
  ): IRepository<T> {
    const cacheKey = `${this.databaseType}:${tableName}`;

    if (repositoryCache.has(cacheKey)) {
      return repositoryCache.get(cacheKey) as IRepository<T>;
    }

    let repository: IRepository<T>;

    switch (this.databaseType) {
      case 'mongodb':
        repository = new MongoRepository<T>(tableName);
        break;
      case 'postgresql':
        repository = new PostgresRepository<T>(tableName);
        break;
      default:
        throw new Error(`Unsupported database type: ${this.databaseType}`);
    }

    repositoryCache.set(cacheKey, repository);
    return repository;
  }

  /**
   * 清除缓存
   */
  static clearCache(): void {
    repositoryCache.clear();
  }
}

/**
 * 便捷函数 - 获取用户仓库
 */
export function getUserRepository(): IRepository<import('./repositories/user.js').User> {
  return DAOFactory.createRepository('users');
}

/**
 * 便捷函数 - 获取策略仓库
 */
export function getStrategyRepository(): IRepository<import('./repositories/strategy.js').Strategy> {
  return DAOFactory.createRepository('strategies');
}

/**
 * 便捷函数 - 获取回测仓库
 */
export function getBacktestRepository(): IRepository<import('./repositories/backtest.js').Backtest> {
  return DAOFactory.createRepository('backtests');
}

/**
 * 便捷函数 - 获取交易仓库
 */
export function getTradeRepository(): IRepository<import('./repositories/trade.js').Trade> {
  return DAOFactory.createRepository('trades');
}
