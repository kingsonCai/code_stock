/**
 * DAO 层类型定义
 */

// 查询选项
export interface QueryOptions {
  skip?: number;
  limit?: number;
  sort?: Record<string, 1 | -1>;
  fields?: string[];
}

// 分页结果
export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// 基础实体接口
export interface BaseEntity {
  id: string;
  createdAt: Date;
  updatedAt: Date;
}

// 仓库接口 - 定义所有数据访问操作的契约
export interface IRepository<T extends BaseEntity> {
  // 基础 CRUD
  findById(id: string): Promise<T | null>;
  findOne(filter: Partial<T>): Promise<T | null>;
  findMany(filter: Partial<T>, options?: QueryOptions): Promise<T[]>;
  create(entity: Omit<T, 'id' | 'createdAt' | 'updatedAt'>): Promise<T>;
  update(id: string, entity: Partial<T>): Promise<T | null>;
  delete(id: string): Promise<boolean>;

  // 批量操作
  createMany(entities: Array<Omit<T, 'id' | 'createdAt' | 'updatedAt'>>): Promise<T[]>;
  updateMany(filter: Partial<T>, update: Partial<T>): Promise<number>;
  deleteMany(filter: Partial<T>): Promise<number>;
  count(filter: Partial<T>): Promise<number>;

  // 分页查询
  paginate(
    filter: Partial<T>,
    page: number,
    pageSize: number,
    options?: QueryOptions
  ): Promise<PaginatedResult<T>>;

  // 原始查询（用于复杂场景）
  raw<R>(operation: (client: unknown) => Promise<R>): Promise<R>;

  // 事务支持
  withTransaction<R>(fn: (session: unknown) => Promise<R>): Promise<R>;
}

// 数据库连接接口
export interface IDatabaseConnection {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  isConnected(): boolean;
  getClient(): unknown;
}

// 数据库类型
export type DatabaseType = 'mongodb' | 'postgresql';
