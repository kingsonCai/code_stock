/**
 * 数据库连接管理
 */
import { MongoClient, MongoClientOptions } from 'mongodb';
import { Pool, PoolConfig } from 'pg';
import { config } from '../config/index.js';
import { IDatabaseConnection, DatabaseType } from './types.js';
import { logger } from '../config/logger.js';

/**
 * MongoDB 连接管理器
 */
export class MongoConnection implements IDatabaseConnection {
  private client: MongoClient | null = null;
  private uri: string;
  private dbName: string;

  constructor(uri: string, dbName: string) {
    this.uri = uri;
    this.dbName = dbName;
  }

  async connect(): Promise<void> {
    if (this.client) {
      return;
    }

    const options: MongoClientOptions = {
      maxPoolSize: 10,
      minPoolSize: 2,
      maxIdleTimeMS: 30000,
    };

    this.client = new MongoClient(this.uri, options);
    await this.client.connect();
    logger.info(`MongoDB connected to ${this.dbName}`);
  }

  async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.close();
      this.client = null;
      logger.info('MongoDB disconnected');
    }
  }

  isConnected(): boolean {
    return this.client !== null;
  }

  getClient(): MongoClient {
    if (!this.client) {
      throw new Error('MongoDB not connected');
    }
    return this.client;
  }

  getDb() {
    return this.getClient().db(this.dbName);
  }
}

/**
 * PostgreSQL 连接管理器
 */
export class PostgresConnection implements IDatabaseConnection {
  private pool: Pool | null = null;
  private config: PoolConfig;

  constructor(config: PoolConfig) {
    this.config = config;
  }

  async connect(): Promise<void> {
    if (this.pool) {
      return;
    }

    this.pool = new Pool(this.config);

    // 测试连接
    const client = await this.pool.connect();
    client.release();
    logger.info(`PostgreSQL connected to ${this.config.database}`);
  }

  async disconnect(): Promise<void> {
    if (this.pool) {
      await this.pool.end();
      this.pool = null;
      logger.info('PostgreSQL disconnected');
    }
  }

  isConnected(): boolean {
    return this.pool !== null;
  }

  getClient(): Pool {
    if (!this.pool) {
      throw new Error('PostgreSQL not connected');
    }
    return this.pool;
  }

  getPool(): Pool {
    return this.getClient();
  }
}

// 全局连接实例
let mongoConnection: MongoConnection | null = null;
let postgresConnection: PostgresConnection | null = null;

/**
 * 获取 MongoDB 连接
 */
export function getMongoConnection(): MongoConnection {
  if (!mongoConnection) {
    mongoConnection = new MongoConnection(
      config.database.mongo.uri,
      config.database.mongo.dbName
    );
  }
  return mongoConnection;
}

/**
 * 获取 PostgreSQL 连接
 */
export function getPostgresConnection(): PostgresConnection {
  if (!postgresConnection) {
    postgresConnection = new PostgresConnection({
      host: config.database.postgres.host,
      port: config.database.postgres.port,
      user: config.database.postgres.user,
      password: config.database.postgres.password,
      database: config.database.postgres.database,
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
export async function initDatabase(type?: DatabaseType): Promise<void> {
  const dbType = type || config.database.type;

  if (dbType === 'mongodb') {
    await getMongoConnection().connect();
  } else if (dbType === 'postgresql') {
    await getPostgresConnection().connect();
  } else {
    throw new Error(`Unsupported database type: ${dbType}`);
  }
}

/**
 * 关闭数据库连接
 */
export async function closeDatabase(): Promise<void> {
  if (mongoConnection) {
    await mongoConnection.disconnect();
  }
  if (postgresConnection) {
    await postgresConnection.disconnect();
  }
}
