/**
 * DAO 层类型定义
 */
export interface QueryOptions {
    skip?: number;
    limit?: number;
    sort?: Record<string, 1 | -1>;
    fields?: string[];
}
export interface PaginatedResult<T> {
    data: T[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
}
export interface BaseEntity {
    id: string;
    createdAt: Date;
    updatedAt: Date;
}
export interface IRepository<T extends BaseEntity> {
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
    raw<R>(operation: (client: unknown) => Promise<R>): Promise<R>;
    withTransaction<R>(fn: (session: unknown) => Promise<R>): Promise<R>;
}
export interface IDatabaseConnection {
    connect(): Promise<void>;
    disconnect(): Promise<void>;
    isConnected(): boolean;
    getClient(): unknown;
}
export type DatabaseType = 'mongodb' | 'postgresql';
//# sourceMappingURL=types.d.ts.map