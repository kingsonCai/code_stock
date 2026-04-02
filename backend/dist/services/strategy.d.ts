import { Strategy, CreateStrategyData, UpdateStrategyData, StrategyStatus } from '../dao/repositories/strategy.js';
import { PaginatedResult } from '../dao/types.js';
declare class StrategyService {
    private getRepository;
    /**
     * 创建策略
     */
    create(userId: string, data: CreateStrategyData): Promise<Strategy>;
    /**
     * 获取策略详情
     */
    getById(strategyId: string, userId?: string): Promise<Strategy>;
    /**
     * 获取用户的策略列表
     */
    getUserStrategies(userId: string, options?: {
        status?: StrategyStatus;
        page?: number;
        pageSize?: number;
    }): Promise<PaginatedResult<Strategy>>;
    /**
     * 获取公开策略列表
     */
    getPublicStrategies(options?: {
        page?: number;
        pageSize?: number;
    }): Promise<PaginatedResult<Strategy>>;
    /**
     * 更新策略
     */
    update(strategyId: string, userId: string, data: UpdateStrategyData): Promise<Strategy>;
    /**
     * 删除策略
     */
    delete(strategyId: string, userId: string): Promise<void>;
    /**
     * 复制策略
     */
    duplicate(strategyId: string, userId: string): Promise<Strategy>;
    /**
     * 发布策略
     */
    publish(strategyId: string, userId: string): Promise<Strategy>;
    /**
     * 归档策略
     */
    archive(strategyId: string, userId: string): Promise<Strategy>;
}
export declare const strategyService: StrategyService;
export {};
//# sourceMappingURL=strategy.d.ts.map