/**
 * 策略服务
 */
import { DAOFactory } from '../dao/factory.js';
import {
  Strategy,
  CreateStrategyData,
  UpdateStrategyData,
  StrategyStatus
} from '../dao/repositories/strategy.js';
import { NotFoundError, ForbiddenError } from '../middleware/error.js';
import { QueryOptions, PaginatedResult } from '../dao/types.js';

class StrategyService {
  private getRepository() {
    return DAOFactory.createRepository<Strategy>('strategies');
  }

  /**
   * 创建策略
   */
  async create(userId: string, data: CreateStrategyData): Promise<Strategy> {
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
  async getById(strategyId: string, userId?: string): Promise<Strategy> {
    const repo = this.getRepository();
    const strategy = await repo.findById(strategyId);

    if (!strategy) {
      throw new NotFoundError('Strategy not found');
    }

    // 检查访问权限
    if (!strategy.isPublic && userId !== strategy.userId) {
      throw new ForbiddenError('You do not have access to this strategy');
    }

    return strategy;
  }

  /**
   * 获取用户的策略列表
   */
  async getUserStrategies(
    userId: string,
    options?: { status?: StrategyStatus; page?: number; pageSize?: number }
  ): Promise<PaginatedResult<Strategy>> {
    const repo = this.getRepository();
    const { status, page = 1, pageSize = 20 } = options || {};

    const filter: Partial<Strategy> = { userId };
    if (status) {
      filter.status = status;
    }

    return repo.paginate(filter, page, pageSize, { sort: { updatedAt: -1 } });
  }

  /**
   * 获取公开策略列表
   */
  async getPublicStrategies(options?: {
    page?: number;
    pageSize?: number;
  }): Promise<PaginatedResult<Strategy>> {
    const repo = this.getRepository();
    const { page = 1, pageSize = 20 } = options || {};

    return repo.paginate(
      { isPublic: true, status: 'published' } as Partial<Strategy>,
      page,
      pageSize,
      { sort: { updatedAt: -1 } }
    );
  }

  /**
   * 更新策略
   */
  async update(
    strategyId: string,
    userId: string,
    data: UpdateStrategyData
  ): Promise<Strategy> {
    const repo = this.getRepository();

    // 检查策略是否存在且属于用户
    const strategy = await repo.findById(strategyId);
    if (!strategy) {
      throw new NotFoundError('Strategy not found');
    }

    if (strategy.userId !== userId) {
      throw new ForbiddenError('You do not have permission to update this strategy');
    }

    const updated = await repo.update(strategyId, data);
    if (!updated) {
      throw new NotFoundError('Strategy not found');
    }

    return updated;
  }

  /**
   * 删除策略
   */
  async delete(strategyId: string, userId: string): Promise<void> {
    const repo = this.getRepository();

    // 检查策略是否存在且属于用户
    const strategy = await repo.findById(strategyId);
    if (!strategy) {
      throw new NotFoundError('Strategy not found');
    }

    if (strategy.userId !== userId) {
      throw new ForbiddenError('You do not have permission to delete this strategy');
    }

    await repo.delete(strategyId);
  }

  /**
   * 复制策略
   */
  async duplicate(strategyId: string, userId: string): Promise<Strategy> {
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
  async publish(strategyId: string, userId: string): Promise<Strategy> {
    return this.update(strategyId, userId, {
      status: 'published',
      isPublic: true,
    });
  }

  /**
   * 归档策略
   */
  async archive(strategyId: string, userId: string): Promise<Strategy> {
    return this.update(strategyId, userId, {
      status: 'archived',
    });
  }
}

export const strategyService = new StrategyService();
