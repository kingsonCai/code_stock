/**
 * MongoDB Repository 实现
 */
import { Db, Collection, Filter, FindOptions, Document, ClientSession } from 'mongodb';
import { IRepository, BaseEntity, QueryOptions, PaginatedResult } from './types.js';
/**
 * MongoDB 仓库实现
 */
export declare class MongoRepository<T extends BaseEntity> implements IRepository<T> {
    protected collection: Collection<Document>;
    protected collectionName: string;
    constructor(collectionName: string);
    /**
     * 将 MongoDB 文档转换为实体
     */
    protected toEntity(doc: Document | null): T | null;
    /**
     * 将实体转换为 MongoDB 文档
     */
    protected toDocument(entity: Partial<T>): Document;
    /**
     * 构建查询过滤器
     */
    protected buildFilter(filter: Partial<T>): Filter<Document>;
    /**
     * 构建查询选项
     */
    protected buildFindOptions(options?: QueryOptions): FindOptions;
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
    raw<R>(operation: (client: Db) => Promise<R>): Promise<R>;
    withTransaction<R>(fn: (session: ClientSession) => Promise<R>): Promise<R>;
}
//# sourceMappingURL=mongo.d.ts.map