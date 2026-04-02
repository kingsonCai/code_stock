/**
 * PostgreSQL Repository 实现
 */
import { Pool, PoolClient } from 'pg';
import { IRepository, BaseEntity, QueryOptions, PaginatedResult } from './types.js';
/**
 * PostgreSQL 仓库实现
 */
export declare class PostgresRepository<T extends BaseEntity> implements IRepository<T> {
    protected pool: Pool;
    protected tableName: string;
    constructor(tableName: string);
    /**
     * 构建 WHERE 子句
     */
    protected buildWhereClause(filter: Partial<T>, startIndex?: number): {
        clause: string;
        values: unknown[];
    };
    /**
     * 构建 ORDER BY 子句
     */
    protected buildOrderBy(sort?: Record<string, 1 | -1>): string;
    /**
     * 驼峰转蛇形
     */
    protected toSnakeCase(str: string): string;
    /**
     * 蛇形转驼峰
     */
    protected toCamelCase(str: string): string;
    /**
     * 将数据库行转换为实体
     */
    protected rowToEntity(row: Record<string, unknown>): T;
    /**
     * 将实体转换为数据库行
     */
    protected entityToRow(entity: Partial<T>): Record<string, unknown>;
    findById(id: string): Promise<T | null>;
    findOne(filter: Partial<T>): Promise<T | null>;
    findMany(filter: Partial<T>, options?: QueryOptions): Promise<T[]>;
    create(entity: Omit<T, 'id' | 'createdAt' | 'updatedAt'>): Promise<T>;
    update(id: string, entity: Partial<T>): Promise<T | null>;
    delete(id: string): Promise<boolean>;
    createMany(entities: Array<Omit<T, 'id' | 'createdAt' | 'updatedAt'>>): Promise<T[]>;
    updateMany(filter: Partial<T>, update: Partial<T>): Promise<number>;
    deleteMany(filter: Partial<T>): Promise<number>;
    count(filter: Partial<T>): Promise<number>;
    paginate(filter: Partial<T>, page: number, pageSize: number, options?: QueryOptions): Promise<PaginatedResult<T>>;
    raw<R>(operation: (client: Pool) => Promise<R>): Promise<R>;
    withTransaction<R>(fn: (client: PoolClient) => Promise<R>): Promise<R>;
}
//# sourceMappingURL=postgresql.d.ts.map