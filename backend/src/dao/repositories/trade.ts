/**
 * 交易实体定义
 */
import { BaseEntity } from '../types.js';

export type TradeSide = 'buy' | 'sell';
export type OrderType = 'market' | 'limit' | 'stop' | 'stop_limit';
export type TradeStatus = 'pending' | 'filled' | 'partial' | 'cancelled' | 'rejected';

export interface Trade extends BaseEntity {
  userId: string;
  strategyId?: string;
  backtestId?: string;
  symbol: string;
  side: TradeSide;
  orderType: OrderType;
  quantity: number;
  price?: number;
  filledQuantity?: number;
  filledPrice?: number;
  commission?: number;
  status: TradeStatus;
  executedAt?: Date;
}

/**
 * 创建交易时的数据
 */
export type CreateTradeData = Omit<Trade, 'id' | 'createdAt' | 'updatedAt'>;

/**
 * 更新交易时的数据
 */
export type UpdateTradeData = Partial<
  Pick<
    Trade,
    | 'filledQuantity'
    | 'filledPrice'
    | 'commission'
    | 'status'
    | 'executedAt'
  >
>;
