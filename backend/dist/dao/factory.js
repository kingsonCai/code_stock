"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DAOFactory = void 0;
exports.getUserRepository = getUserRepository;
exports.getStrategyRepository = getStrategyRepository;
exports.getBacktestRepository = getBacktestRepository;
exports.getTradeRepository = getTradeRepository;
const mongo_js_1 = require("./mongo.js");
const postgresql_js_1 = require("./postgresql.js");
const index_js_1 = require("../config/index.js");
// Repository 缓存
const repositoryCache = new Map();
/**
 * DAO 工厂类
 */
class DAOFactory {
    static databaseType = index_js_1.config.database.type;
    /**
     * 配置数据库类型
     */
    static setDatabaseType(type) {
        this.databaseType = type;
        // 清除缓存
        repositoryCache.clear();
    }
    /**
     * 获取当前数据库类型
     */
    static getDatabaseType() {
        return this.databaseType;
    }
    /**
     * 创建或获取 Repository 实例
     */
    static createRepository(tableName) {
        const cacheKey = `${this.databaseType}:${tableName}`;
        if (repositoryCache.has(cacheKey)) {
            return repositoryCache.get(cacheKey);
        }
        let repository;
        switch (this.databaseType) {
            case 'mongodb':
                repository = new mongo_js_1.MongoRepository(tableName);
                break;
            case 'postgresql':
                repository = new postgresql_js_1.PostgresRepository(tableName);
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
    static clearCache() {
        repositoryCache.clear();
    }
}
exports.DAOFactory = DAOFactory;
/**
 * 便捷函数 - 获取用户仓库
 */
function getUserRepository() {
    return DAOFactory.createRepository('users');
}
/**
 * 便捷函数 - 获取策略仓库
 */
function getStrategyRepository() {
    return DAOFactory.createRepository('strategies');
}
/**
 * 便捷函数 - 获取回测仓库
 */
function getBacktestRepository() {
    return DAOFactory.createRepository('backtests');
}
/**
 * 便捷函数 - 获取交易仓库
 */
function getTradeRepository() {
    return DAOFactory.createRepository('trades');
}
//# sourceMappingURL=factory.js.map