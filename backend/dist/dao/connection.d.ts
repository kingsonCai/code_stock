/**
 * 数据库连接管理
 */
import { MongoClient } from 'mongodb';
import { Pool, PoolConfig } from 'pg';
import { IDatabaseConnection, DatabaseType } from './types.js';
/**
 * MongoDB 连接管理器
 */
export declare class MongoConnection implements IDatabaseConnection {
    private client;
    private uri;
    private dbName;
    constructor(uri: string, dbName: string);
    connect(): Promise<void>;
    disconnect(): Promise<void>;
    isConnected(): boolean;
    getClient(): MongoClient;
    getDb(): import("mongodb").Db;
}
/**
 * PostgreSQL 连接管理器
 */
export declare class PostgresConnection implements IDatabaseConnection {
    private pool;
    private config;
    constructor(config: PoolConfig);
    connect(): Promise<void>;
    disconnect(): Promise<void>;
    isConnected(): boolean;
    getClient(): Pool;
    getPool(): Pool;
}
/**
 * 获取 MongoDB 连接
 */
export declare function getMongoConnection(): MongoConnection;
/**
 * 获取 PostgreSQL 连接
 */
export declare function getPostgresConnection(): PostgresConnection;
/**
 * 初始化数据库连接
 */
export declare function initDatabase(type?: DatabaseType): Promise<void>;
/**
 * 关闭数据库连接
 */
export declare function closeDatabase(): Promise<void>;
//# sourceMappingURL=connection.d.ts.map