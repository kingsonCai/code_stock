/**
 * MongoDB Repository 实现
 */
import {
  Db,
  Collection,
  ObjectId,
  Filter,
  FindOptions,
  Sort,
  Document,
  ClientSession
} from 'mongodb';
import {
  IRepository,
  BaseEntity,
  QueryOptions,
  PaginatedResult
} from './types.js';
import { getMongoConnection } from './connection.js';

/**
 * MongoDB 仓库实现
 */
export class MongoRepository<T extends BaseEntity> implements IRepository<T> {
  protected collection: Collection<Document>;
  protected collectionName: string;

  constructor(collectionName: string) {
    const db = getMongoConnection().getDb();
    this.collection = db.collection(collectionName);
    this.collectionName = collectionName;
  }

  /**
   * 将 MongoDB 文档转换为实体
   */
  protected toEntity(doc: Document | null): T | null {
    if (!doc) return null;

    const { _id, ...rest } = doc;
    return {
      ...rest,
      id: _id.toString(),
    } as T;
  }

  /**
   * 将实体转换为 MongoDB 文档
   */
  protected toDocument(entity: Partial<T>): Document {
    const { id, ...rest } = entity as Document;
    return rest;
  }

  /**
   * 构建查询过滤器
   */
  protected buildFilter(filter: Partial<T>): Filter<Document> {
    const result: Filter<Document> = {};

    for (const [key, value] of Object.entries(filter)) {
      if (value !== undefined && value !== null) {
        if (key === 'id') {
          result._id = new ObjectId(value as string);
        } else {
          result[key] = value;
        }
      }
    }

    return result;
  }

  /**
   * 构建查询选项
   */
  protected buildFindOptions(options?: QueryOptions): FindOptions {
    const findOptions: FindOptions = {};

    if (options?.skip !== undefined) {
      findOptions.skip = options.skip;
    }
    if (options?.limit !== undefined) {
      findOptions.limit = options.limit;
    }
    if (options?.sort) {
      findOptions.sort = options.sort as Sort;
    }
    if (options?.fields) {
      findOptions.projection = {};
      for (const field of options.fields) {
        findOptions.projection[field] = 1;
      }
    }

    return findOptions;
  }

  async findById(id: string): Promise<T | null> {
    const doc = await this.collection.findOne({ _id: new ObjectId(id) });
    return this.toEntity(doc);
  }

  async findOne(filter: Partial<T>): Promise<T | null> {
    const doc = await this.collection.findOne(this.buildFilter(filter));
    return this.toEntity(doc);
  }

  async findMany(filter: Partial<T>, options?: QueryOptions): Promise<T[]> {
    const cursor = this.collection.find(
      this.buildFilter(filter),
      this.buildFindOptions(options)
    );

    const docs = await cursor.toArray();
    return docs.map(doc => this.toEntity(doc)!).filter(Boolean);
  }

  async create(entity: Omit<T, 'id' | 'createdAt' | 'updatedAt'>): Promise<T> {
    const now = new Date();
    const doc = {
      ...this.toDocument(entity as T),
      createdAt: now,
      updatedAt: now,
    };

    const result = await this.collection.insertOne(doc);
    return {
      ...entity,
      id: result.insertedId.toString(),
      createdAt: now,
      updatedAt: now,
    } as T;
  }

  async update(id: string, entity: Partial<T>): Promise<T | null> {
    const updateDoc = {
      ...this.toDocument(entity),
      updatedAt: new Date(),
    };

    const result = await this.collection.findOneAndUpdate(
      { _id: new ObjectId(id) },
      { $set: updateDoc },
      { returnDocument: 'after' }
    );

    return this.toEntity(result);
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.collection.deleteOne({ _id: new ObjectId(id) });
    return result.deletedCount === 1;
  }

  async createMany(
    entities: Array<Omit<T, 'id' | 'createdAt' | 'updatedAt'>>
  ): Promise<T[]> {
    const now = new Date();
    const docs = entities.map(entity => ({
      ...this.toDocument(entity as T),
      createdAt: now,
      updatedAt: now,
    }));

    const result = await this.collection.insertMany(docs);

    return Object.values(result.insertedIds).map((id, index) => ({
      ...entities[index],
      id: id.toString(),
      createdAt: now,
      updatedAt: now,
    })) as T[];
  }

  async updateMany(filter: Partial<T>, update: Partial<T>): Promise<number> {
    const updateDoc = {
      ...this.toDocument(update),
      updatedAt: new Date(),
    };

    const result = await this.collection.updateMany(
      this.buildFilter(filter),
      { $set: updateDoc }
    );

    return result.modifiedCount;
  }

  async deleteMany(filter: Partial<T>): Promise<number> {
    const result = await this.collection.deleteMany(this.buildFilter(filter));
    return result.deletedCount;
  }

  async count(filter: Partial<T>): Promise<number> {
    return this.collection.countDocuments(this.buildFilter(filter));
  }

  async paginate(
    filter: Partial<T>,
    page: number,
    pageSize: number,
    options?: QueryOptions
  ): Promise<PaginatedResult<T>> {
    const skip = (page - 1) * pageSize;
    const total = await this.count(filter);
    const totalPages = Math.ceil(total / pageSize);

    const data = await this.findMany(filter, {
      ...options,
      skip,
      limit: pageSize,
    });

    return {
      data,
      total,
      page,
      pageSize,
      totalPages,
    };
  }

  async raw<R>(operation: (client: Db) => Promise<R>): Promise<R> {
    const db = getMongoConnection().getDb();
    return operation(db);
  }

  async withTransaction<R>(fn: (session: ClientSession) => Promise<R>): Promise<R> {
    const client = getMongoConnection().getClient();
    const session = client.startSession();

    try {
      let result: R;
      await session.withTransaction(async () => {
        result = await fn(session);
      });
      return result!;
    } finally {
      await session.endSession();
    }
  }
}
