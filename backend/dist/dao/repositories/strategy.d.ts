/**
 * 策略实体定义
 */
import { BaseEntity } from '../types.js';
export type StrategyStatus = 'draft' | 'published' | 'archived';
export interface StrategyConfig {
    symbols?: string[];
    timeframe?: string;
    startDate?: string;
    endDate?: string;
    initialCapital?: number;
    commission?: number;
    [key: string]: unknown;
}
export interface Strategy extends BaseEntity {
    userId: string;
    name: string;
    description?: string;
    code: string;
    status: StrategyStatus;
    isPublic: boolean;
    config: StrategyConfig;
}
/**
 * 创建策略时的数据
 */
export type CreateStrategyData = Omit<Strategy, 'id' | 'createdAt' | 'updatedAt'>;
/**
 * 更新策略时的数据
 */
export type UpdateStrategyData = Partial<Pick<Strategy, 'name' | 'description' | 'code' | 'status' | 'isPublic' | 'config'>>;
//# sourceMappingURL=strategy.d.ts.map