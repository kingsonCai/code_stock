"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PostgresConnection = exports.MongoConnection = void 0;
exports.getMongoConnection = getMongoConnection;
exports.getPostgresConnection = getPostgresConnection;
exports.initDatabase = initDatabase;
exports.closeDatabase = closeDatabase;
/**
 * 数据库连接管理
 */
const mongodb_1 = require("mongodb");
const pg_1 = require("pg");
const index_js_1 = require("../config/index.js");
const logger_js_1 = require("../config/logger.js");
/**
 * MongoDB 连接管理器
 */
class MongoConnection {
    client = null;
    uri;
    dbName;
    constructor(uri, dbName) {
        this.uri = uri;
        this.dbName = dbName;
    }
    async connect() {
        if (this.client) {
            return;
        }
        const options = {
            maxPoolSize: 10,
            minPoolSize: 2,
            maxIdleTimeMS: 30000,
        };
        this.client = new mongodb_1.MongoClient(this.uri, options);
        await this.client.connect();
        logger_js_1.logger.info(`MongoDB connected to ${this.dbName}`);
    }
    async disconnect() {
        if (this.client) {
            await this.client.close();
            this.client = null;
            logger_js_1.logger.info('MongoDB disconnected');
        }
    }
    isConnected() {
        return this.client !== null;
    }
    getClient() {
        if (!this.client) {
            throw new Error('MongoDB not connected');
        }
        return this.client;
    }
    getDb() {
        return this.getClient().db(this.dbName);
    }
}
exports.MongoConnection = MongoConnection;
/**
 * PostgreSQL 连接管理器
 */
class PostgresConnection {
    pool = null;
    config;
    constructor(config) {
        this.config = config;
    }
    async connect() {
        if (this.pool) {
            return;
        }
        this.pool = new pg_1.Pool(this.config);
        // 测试连接
        const client = await this.pool.connect();
        client.release();
        logger_js_1.logger.info(`PostgreSQL connected to ${this.config.database}`);
    }
    async disconnect() {
        if (this.pool) {
            await this.pool.end();
            this.pool = null;
            logger_js_1.logger.info('PostgreSQL disconnected');
        }
    }
    isConnected() {
        return this.pool !== null;
    }
    getClient() {
        if (!this.pool) {
            throw new Error('PostgreSQL not connected');
        }
        return this.pool;
    }
    getPool() {
        return this.getClient();
    }
}
exports.PostgresConnection = PostgresConnection;
// 全局连接实例
let mongoConnection = null;
let postgresConnection = null;
/**
 * 获取 MongoDB 连接
 */
function getMongoConnection() {
    if (!mongoConnection) {
        mongoConnection = new MongoConnection(index_js_1.config.database.mongo.uri, index_js_1.config.database.mongo.dbName);
    }
    return mongoConnection;
}
/**
 * 获取 PostgreSQL 连接
 */
function getPostgresConnection() {
    if (!postgresConnection) {
        postgresConnection = new PostgresConnection({
            host: index_js_1.config.database.postgres.host,
            port: index_js_1.config.database.postgres.port,
            user: index_js_1.config.database.postgres.user,
            password: index_js_1.config.database.postgres.password,
            database: index_js_1.config.database.postgres.database,
            max: 10,
            idleTimeoutMillis: 30000,
            connectionTimeoutMillis: 2000,
        });
    }
    return postgresConnection;
}
/**
 * 初始化数据库连接
 */
async function initDatabase(type) {
    const dbType = type || index_js_1.config.database.type;
    if (dbType === 'mongodb') {
        await getMongoConnection().connect();
    }
    else if (dbType === 'postgresql') {
        await getPostgresConnection().connect();
    }
    else {
        throw new Error(`Unsupported database type: ${dbType}`);
    }
}
/**
 * 关闭数据库连接
 */
async function closeDatabase() {
    if (mongoConnection) {
        await mongoConnection.disconnect();
    }
    if (postgresConnection) {
        await postgresConnection.disconnect();
    }
}
//# sourceMappingURL=connection.js.map