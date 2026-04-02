"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.strategyService = void 0;
/**
 * 策略服务
 */
const factory_js_1 = require("../dao/factory.js");
const error_js_1 = require("../middleware/error.js");
class StrategyService {
    getRepository() {
        return factory_js_1.DAOFactory.createRepository('strategies');
    }
    /**
     * 创建策略
     */
    async create(userId, data) {
        const repo = this.getRepository();
        const strategy = await repo.create({
            ...data,
            status: data.status || 'draft',
            isPublic: data.isPublic ?? false,
            config: data.config || {},
        });
        return strategy;
    }
    /**
     * 获取策略详情
     */
    async getById(strategyId, userId) {
        const repo = this.getRepository();
        const strategy = await repo.findById(strategyId);
        if (!strategy) {
            throw new error_js_1.NotFoundError('Strategy not found');
        }
        // 检查访问权限
        if (!strategy.isPublic && userId !== strategy.userId) {
            throw new error_js_1.ForbiddenError('You do not have access to this strategy');
        }
        return strategy;
    }
    /**
     * 获取用户的策略列表
     */
    async getUserStrategies(userId, options) {
        const repo = this.getRepository();
        const { status, page = 1, pageSize = 20 } = options || {};
        const filter = { userId };
        if (status) {
            filter.status = status;
        }
        return repo.paginate(filter, page, pageSize, { sort: { updatedAt: -1 } });
    }
    /**
     * 获取公开策略列表
     */
    async getPublicStrategies(options) {
        const repo = this.getRepository();
        const { page = 1, pageSize = 20 } = options || {};
        return repo.paginate({ isPublic: true, status: 'published' }, page, pageSize, { sort: { updatedAt: -1 } });
    }
    /**
     * 更新策略
     */
    async update(strategyId, userId, data) {
        const repo = this.getRepository();
        // 检查策略是否存在且属于用户
        const strategy = await repo.findById(strategyId);
        if (!strategy) {
            throw new error_js_1.NotFoundError('Strategy not found');
        }
        if (strategy.userId !== userId) {
            throw new error_js_1.ForbiddenError('You do not have permission to update this strategy');
        }
        const updated = await repo.update(strategyId, data);
        if (!updated) {
            throw new error_js_1.NotFoundError('Strategy not found');
        }
        return updated;
    }
    /**
     * 删除策略
     */
    async delete(strategyId, userId) {
        const repo = this.getRepository();
        // 检查策略是否存在且属于用户
        const strategy = await repo.findById(strategyId);
        if (!strategy) {
            throw new error_js_1.NotFoundError('Strategy not found');
        }
        if (strategy.userId !== userId) {
            throw new error_js_1.ForbiddenError('You do not have permission to delete this strategy');
        }
        await repo.delete(strategyId);
    }
    /**
     * 复制策略
     */
    async duplicate(strategyId, userId) {
        const repo = this.getRepository();
        const original = await this.getById(strategyId, userId);
        const duplicated = await repo.create({
            userId,
            name: `${original.name} (Copy)`,
            description: original.description,
            code: original.code,
            status: 'draft',
            isPublic: false,
            config: original.config,
        });
        return duplicated;
    }
    /**
     * 发布策略
     */
    async publish(strategyId, userId) {
        return this.update(strategyId, userId, {
            status: 'published',
            isPublic: true,
        });
    }
    /**
     * 归档策略
     */
    async archive(strategyId, userId) {
        return this.update(strategyId, userId, {
            status: 'archived',
        });
    }
}
exports.strategyService = new StrategyService();
//# sourceMappingURL=strategy.js.map