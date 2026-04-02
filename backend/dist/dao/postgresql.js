"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PostgresRepository = void 0;
const connection_js_1 = require("./connection.js");
/**
 * PostgreSQL 仓库实现
 */
class PostgresRepository {
    pool;
    tableName;
    constructor(tableName) {
        this.pool = (0, connection_js_1.getPostgresConnection)().getPool();
        this.tableName = tableName;
    }
    /**
     * 构建 WHERE 子句
     */
    buildWhereClause(filter, startIndex = 1) {
        const conditions = [];
        const values = [];
        let paramIndex = startIndex;
        for (const [key, value] of Object.entries(filter)) {
            if (value !== undefined && value !== null) {
                if (typeof value === 'object' && !(value instanceof Date)) {
                    // JSONB 查询
                    conditions.push(`${key} @> $${paramIndex}`);
                    values.push(JSON.stringify(value));
                }
                else {
                    conditions.push(`${key} = $${paramIndex}`);
                    values.push(value);
                }
                paramIndex++;
            }
        }
        const clause = conditions.length > 0 ? conditions.join(' AND ') : '1=1';
        return { clause, values };
    }
    /**
     * 构建 ORDER BY 子句
     */
    buildOrderBy(sort) {
        if (!sort || Object.keys(sort).length === 0) {
            return 'created_at DESC';
        }
        const orderClauses = Object.entries(sort).map(([field, direction]) => {
            const snakeField = this.toSnakeCase(field);
            return `${snakeField} ${direction === 1 ? 'ASC' : 'DESC'}`;
        });
        return orderClauses.join(', ');
    }
    /**
     * 驼峰转蛇形
     */
    toSnakeCase(str) {
        return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
    }
    /**
     * 蛇形转驼峰
     */
    toCamelCase(str) {
        return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
    }
    /**
     * 将数据库行转换为实体
     */
    rowToEntity(row) {
        const entity = {};
        for (const [key, value] of Object.entries(row)) {
            const camelKey = this.toCamelCase(key);
            entity[camelKey] = value;
        }
        // 确保 id 是字符串
        if (entity.id) {
            entity.id = String(entity.id);
        }
        return entity;
    }
    /**
     * 将实体转换为数据库行
     */
    entityToRow(entity) {
        const row = {};
        for (const [key, value] of Object.entries(entity)) {
            if (value !== undefined) {
                const snakeKey = this.toSnakeCase(key);
                row[snakeKey] = value;
            }
        }
        return row;
    }
    async findById(id) {
        const result = await this.pool.query(`SELECT * FROM ${this.tableName} WHERE id = $1`, [id]);
        if (result.rows.length === 0) {
            return null;
        }
        return this.rowToEntity(result.rows[0]);
    }
    async findOne(filter) {
        const { clause, values } = this.buildWhereClause(filter);
        const result = await this.pool.query(`SELECT * FROM ${this.tableName} WHERE ${clause} LIMIT 1`, values);
        if (result.rows.length === 0) {
            return null;
        }
        return this.rowToEntity(result.rows[0]);
    }
    async findMany(filter, options) {
        const { clause, values } = this.buildWhereClause(filter);
        const orderBy = this.buildOrderBy(options?.sort);
        let sql = `SELECT * FROM ${this.tableName} WHERE ${clause} ORDER BY ${orderBy}`;
        if (options?.limit !== undefined) {
            sql += ` LIMIT ${options.limit}`;
        }
        if (options?.skip !== undefined) {
            sql += ` OFFSET ${options.skip}`;
        }
        const result = await this.pool.query(sql, values);
        return result.rows.map((row) => this.rowToEntity(row));
    }
    async create(entity) {
        const row = this.entityToRow(entity);
        // 移除不应该手动设置的字段
        delete row.id;
        delete row.created_at;
        delete row.updated_at;
        const fields = Object.keys(row);
        const values = Object.values(row);
        const placeholders = fields.map((_, i) => `$${i + 1}`).join(', ');
        const fieldNames = fields.join(', ');
        const result = await this.pool.query(`INSERT INTO ${this.tableName} (${fieldNames})
       VALUES (${placeholders})
       RETURNING *`, values);
        return this.rowToEntity(result.rows[0]);
    }
    async update(id, entity) {
        const row = this.entityToRow(entity);
        // 移除不应该更新的字段
        delete row.id;
        delete row.created_at;
        // 自动更新 updated_at
        row.updated_at = new Date();
        const setClauses = [];
        const values = [];
        let paramIndex = 1;
        for (const [key, value] of Object.entries(row)) {
            if (value !== undefined) {
                setClauses.push(`${key} = $${paramIndex}`);
                values.push(value);
                paramIndex++;
            }
        }
        if (setClauses.length === 0) {
            return this.findById(id);
        }
        values.push(id);
        const result = await this.pool.query(`UPDATE ${this.tableName}
       SET ${setClauses.join(', ')}
       WHERE id = $${paramIndex}
       RETURNING *`, values);
        if (result.rows.length === 0) {
            return null;
        }
        return this.rowToEntity(result.rows[0]);
    }
    async delete(id) {
        const result = await this.pool.query(`DELETE FROM ${this.tableName} WHERE id = $1`, [id]);
        return (result.rowCount ?? 0) > 0;
    }
    async createMany(entities) {
        if (entities.length === 0) {
            return [];
        }
        const results = [];
        // PostgreSQL 批量插入
        for (const entity of entities) {
            const created = await this.create(entity);
            results.push(created);
        }
        return results;
    }
    async updateMany(filter, update) {
        const row = this.entityToRow(update);
        delete row.id;
        delete row.created_at;
        row.updated_at = new Date();
        const setClauses = [];
        const values = [];
        let paramIndex = 1;
        for (const [key, value] of Object.entries(row)) {
            if (value !== undefined) {
                setClauses.push(`${key} = $${paramIndex}`);
                values.push(value);
                paramIndex++;
            }
        }
        if (setClauses.length === 0) {
            return 0;
        }
        const { clause: whereClause, values: whereValues } = this.buildWhereClause(filter, paramIndex);
        values.push(...whereValues);
        const result = await this.pool.query(`UPDATE ${this.tableName}
       SET ${setClauses.join(', ')}
       WHERE ${whereClause}`, values);
        return result.rowCount ?? 0;
    }
    async deleteMany(filter) {
        const { clause, values } = this.buildWhereClause(filter);
        const result = await this.pool.query(`DELETE FROM ${this.tableName} WHERE ${clause}`, values);
        return result.rowCount ?? 0;
    }
    async count(filter) {
        const { clause, values } = this.buildWhereClause(filter);
        const result = await this.pool.query(`SELECT COUNT(*) as count FROM ${this.tableName} WHERE ${clause}`, values);
        return parseInt(result.rows[0].count, 10);
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
        return operation(this.pool);
    }
    async withTransaction(fn) {
        const client = await this.pool.connect();
        try {
            await client.query('BEGIN');
            const result = await fn(client);
            await client.query('COMMIT');
            return result;
        }
        catch (error) {
            await client.query('ROLLBACK');
            throw error;
        }
        finally {
            client.release();
        }
    }
}
exports.PostgresRepository = PostgresRepository;
//# sourceMappingURL=postgresql.js.map