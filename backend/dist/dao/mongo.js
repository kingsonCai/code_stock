"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MongoRepository = void 0;
/**
 * MongoDB Repository 实现
 */
const mongodb_1 = require("mongodb");
const connection_js_1 = require("./connection.js");
/**
 * MongoDB 仓库实现
 */
class MongoRepository {
    collection;
    collectionName;
    constructor(collectionName) {
        const db = (0, connection_js_1.getMongoConnection)().getDb();
        this.collection = db.collection(collectionName);
        this.collectionName = collectionName;
    }
    /**
     * 将 MongoDB 文档转换为实体
     */
    toEntity(doc) {
        if (!doc)
            return null;
        const { _id, ...rest } = doc;
        return {
            ...rest,
            id: _id.toString(),
        };
    }
    /**
     * 将实体转换为 MongoDB 文档
     */
    toDocument(entity) {
        const { id, ...rest } = entity;
        return rest;
    }
    /**
     * 构建查询过滤器
     */
    buildFilter(filter) {
        const result = {};
        for (const [key, value] of Object.entries(filter)) {
            if (value !== undefined && value !== null) {
                if (key === 'id') {
                    result._id = new mongodb_1.ObjectId(value);
                }
                else {
                    result[key] = value;
                }
            }
        }
        return result;
    }
    /**
     * 构建查询选项
     */
    buildFindOptions(options) {
        const findOptions = {};
        if (options?.skip !== undefined) {
            findOptions.skip = options.skip;
        }
        if (options?.limit !== undefined) {
            findOptions.limit = options.limit;
        }
        if (options?.sort) {
            findOptions.sort = options.sort;
        }
        if (options?.fields) {
            findOptions.projection = {};
            for (const field of options.fields) {
                findOptions.projection[field] = 1;
            }
        }
        return findOptions;
    }
    async findById(id) {
        const doc = await this.collection.findOne({ _id: new mongodb_1.ObjectId(id) });
        return this.toEntity(doc);
    }
    async findOne(filter) {
        const doc = await this.collection.findOne(this.buildFilter(filter));
        return this.toEntity(doc);
    }
    async findMany(filter, options) {
        const cursor = this.collection.find(this.buildFilter(filter), this.buildFindOptions(options));
        const docs = await cursor.toArray();
        return docs.map(doc => this.toEntity(doc)).filter(Boolean);
    }
    async create(entity) {
        const now = new Date();
        const doc = {
            ...this.toDocument(entity),
            createdAt: now,
            updatedAt: now,
        };
        const result = await this.collection.insertOne(doc);
        return {
            ...entity,
            id: result.insertedId.toString(),
            createdAt: now,
            updatedAt: now,
        };
    }
    async update(id, entity) {
        const updateDoc = {
            ...this.toDocument(entity),
            updatedAt: new Date(),
        };
        const result = await this.collection.findOneAndUpdate({ _id: new mongodb_1.ObjectId(id) }, { $set: updateDoc }, { returnDocument: 'after' });
        return this.toEntity(result);
    }
    async delete(id) {
        const result = await this.collection.deleteOne({ _id: new mongodb_1.ObjectId(id) });
        return result.deletedCount === 1;
    }
    async createMany(entities) {
        const now = new Date();
        const docs = entities.map(entity => ({
            ...this.toDocument(entity),
            createdAt: now,
            updatedAt: now,
        }));
        const result = await this.collection.insertMany(docs);
        return Object.values(result.insertedIds).map((id, index) => ({
            ...entities[index],
            id: id.toString(),
            createdAt: now,
            updatedAt: now,
        }));
    }
    async updateMany(filter, update) {
        const updateDoc = {
            ...this.toDocument(update),
            updatedAt: new Date(),
        };
        const result = await this.collection.updateMany(this.buildFilter(filter), { $set: updateDoc });
        return result.modifiedCount;
    }
    async deleteMany(filter) {
        const result = await this.collection.deleteMany(this.buildFilter(filter));
        return result.deletedCount;
    }
    async count(filter) {
        return this.collection.countDocuments(this.buildFilter(filter));
    }
    async paginate(filter, page, pageSize, options) {
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
    async raw(operation) {
        const db = (0, connection_js_1.getMongoConnection)().getDb();
        return operation(db);
    }
    async withTransaction(fn) {
        const client = (0, connection_js_1.getMongoConnection)().getClient();
        const session = client.startSession();
        try {
            let result;
            await session.withTransaction(async () => {
                result = await fn(session);
            });
            return result;
        }
        finally {
            await session.endSession();
        }
    }
}
exports.MongoRepository = MongoRepository;
//# sourceMappingURL=mongo.js.map