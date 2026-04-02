/**
 * DAO 工厂 - 根据配置创建对应的 Repository
 */
import { IRepository, BaseEntity, DatabaseType } from './types.js';
/**
 * DAO 工厂类
 */
export declare class DAOFactory {
    private static databaseType;
    /**
     * 配置数据库类型
     */
    static setDatabaseType(type: DatabaseType): void;
    /**
     * 获取当前数据库类型
     */
    static getDatabaseType(): DatabaseType;
    /**
     * 创建或获取 Repository 实例
     */
    static createRepository<T extends BaseEntity>(tableName: string): IRepository<T>;
    /**
     * 清除缓存
     */
    static clearCache(): void;
}
/**
 * 便捷函数 - 获取用户仓库
 */
export declare function getUserRepository(): IRepository<import('./repositories/user.js').User>;
/**
 * 便捷函数 - 获取策略仓库
 */
export declare function getStrategyRepository(): IRepository<import('./repositories/strategy.js').Strategy>;
/**
 * 便捷函数 - 获取回测仓库
 */
export declare function getBacktestRepository(): IRepository<import('./repositories/backtest.js').Backtest>;
/**
 * 便捷函数 - 获取交易仓库
 */
export declare function getTradeRepository(): IRepository<import('./repositories/trade.js').Trade>;
//# sourceMappingURL=factory.d.ts.map