/**
 * 投资组合服务
 * 管理用户持仓、账户信息和交易记录
 */
import { wsServer } from '../websocket/server.js';
import { logger } from '../config/logger.js';
import { Trade } from '../dao/repositories/trade.js';

// 持仓信息
export interface Position {
  symbol: string;
  quantity: number;
  avgPrice: number;
  currentPrice: number;
  marketValue: number;
  pnl: number;
  pnlPercent: number;
  updatedAt: number;
}

// 账户信息
export interface AccountInfo {
  totalAssets: number;
  availableCash: number;
  marketValue: number;
  frozenCash: number;
  todayPnl: number;
  todayPnlPercent: number;
  updatedAt: number;
}

// 投资组合数据
export interface PortfolioData {
  account: AccountInfo;
  positions: Position[];
  updatedAt: number;
}

// 持仓快照（用于计算）
interface PositionSnapshot {
  symbol: string;
  quantity: number;
  avgPrice: number;
}

// 用户持仓快照存储
const positionSnapshots = new Map<string, PositionSnapshot[]>();
// 用户最近交易记录
const recentTradeRecords = new Map<string, Trade[]>();

class PortfolioService {
  /**
   * 初始化用户持仓数据
   */
  initUserPortfolio(userId: string, positions: PositionSnapshot[]): void {
    positionSnapshots.set(userId, positions);
    // 初始化一些模拟交易记录
    const now = Date.now();
    const trades: Trade[] = [
      {
        id: `${userId}-trade-1`,
        userId,
        symbol: 'AAPL',
        side: 'buy',
        orderType: 'market',
        quantity: 100,
        price: 175.50,
        filledQuantity: 100,
        filledPrice: 175.50,
        commission: 1.0,
        status: 'filled',
        createdAt: new Date(now - 3600000 * 5),
        updatedAt: new Date(now - 3600000 * 5),
        executedAt: new Date(now - 3600000 * 5),
      },
      {
        id: `${userId}-trade-2`,
        userId,
        symbol: 'GOOGL',
        side: 'buy',
        orderType: 'market',
        quantity: 50,
        price: 138.00,
        filledQuantity: 50,
        filledPrice: 138.00,
        commission: 0.5,
        status: 'filled',
        createdAt: new Date(now - 3600000 * 3),
        updatedAt: new Date(now - 3600000 * 3),
        executedAt: new Date(now - 3600000 * 3),
      },
      {
        id: `${userId}-trade-3`,
        userId,
        symbol: 'MSFT',
        side: 'buy',
        orderType: 'limit',
        quantity: 75,
        price: 378.00,
        filledQuantity: 75,
        filledPrice: 378.00,
        commission: 0.75,
        status: 'filled',
        createdAt: new Date(now - 3600000 * 2),
        updatedAt: new Date(now - 3600000 * 2),
        executedAt: new Date(now - 3600000 * 2),
      },
      {
        id: `${userId}-trade-4`,
        userId,
        symbol: 'NVDA',
        side: 'buy',
        orderType: 'market',
        quantity: 30,
        price: 448.00,
        filledQuantity: 30,
        filledPrice: 448.00,
        commission: 0.3,
        status: 'filled',
        createdAt: new Date(now - 3600000),
        updatedAt: new Date(now - 3600000),
        executedAt: new Date(now - 3600000),
      },
      {
        id: `${userId}-trade-5`,
        userId,
        symbol: 'TSLA',
        side: 'buy',
        orderType: 'market',
        quantity: 20,
        price: 252.00,
        filledQuantity: 20,
        filledPrice: 252.00,
        commission: 0.2,
        status: 'filled',
        createdAt: new Date(now - 1800000),
        updatedAt: new Date(now - 1800000),
        executedAt: new Date(now - 1800000),
      },
    ];
    recentTradeRecords.set(userId, trades);

    logger.info(`Initialized portfolio for user ${userId}`);
  }

  /**
   * 获取用户投资组合
   */
  getPortfolio(userId: string): PortfolioData {
    const snapshots = positionSnapshots.get(userId);
    if (!snapshots || snapshots.length === 0) {
      // 返回默认持仓
      return this.getDefaultPortfolio(userId);
    }

    const positions = snapshots.map((snap) => {
      const marketValue = snap.quantity * snap.avgPrice;
      const pnl = 0;
      return {
        symbol: snap.symbol,
        quantity: snap.quantity,
        avgPrice: snap.avgPrice,
        currentPrice: snap.avgPrice,
        marketValue,
        pnl,
        pnlPercent: 0,
        updatedAt: Date.now(),
      };
    });

    const marketValue = positions.reduce((sum, p) => sum + p.marketValue, 0);
    const totalPnl = positions.reduce((sum, p) => sum + p.pnl, 0);

    const account: AccountInfo = {
      totalAssets: marketValue + 45000, // 可用资金
      availableCash: 45000,
      marketValue,
      frozenCash: 0,
      todayPnl: totalPnl,
      todayPnlPercent: marketValue > 0 ? (totalPnl / marketValue) * 100 : 0,
      updatedAt: Date.now(),
    };

    return {
      account,
      positions,
      updatedAt: Date.now(),
    };
  }

  /**
   * 获取默认投资组合（未初始化时）
   */
  private getDefaultPortfolio(userId: string): PortfolioData {
    const now = Date.now();
    const initialPrices: Record<string, number> = {
      AAPL: 175.50,
      GOOGL: 138.00,
      MSFT: 378.00,
      NVDA: 448.00,
      TSLA: 252.00,
    };

    const positions: Position[] = [
      { symbol: 'AAPL', quantity: 100, avgPrice: 175.50, currentPrice: 175.50, marketValue: 17550, pnl: 0, pnlPercent: 0, updatedAt: now },
      { symbol: 'GOOGL', quantity: 50, avgPrice: 138.00, currentPrice: 138.00, marketValue: 6900, pnl: 0, pnlPercent: 0, updatedAt: now },
      { symbol: 'MSFT', quantity: 75, avgPrice: 378.00, currentPrice: 378.00, marketValue: 28350, pnl: 0, pnlPercent: 0, updatedAt: now },
      { symbol: 'NVDA', quantity: 30, avgPrice: 448.00, currentPrice: 448.00, marketValue: 13440, pnl: 0, pnlPercent: 0, updatedAt: now },
      { symbol: 'TSLA', quantity: 20, avgPrice: 252.00, currentPrice: 252.00, marketValue: 5040, pnl: 0, pnlPercent: 0, updatedAt: now },
    ];

    const marketValue = positions.reduce((sum, p) => sum + p.marketValue, 0);

    const account: AccountInfo = {
      totalAssets: marketValue + 45000,
      availableCash: 45000,
      marketValue,
      frozenCash: 0,
      todayPnl: 0,
      todayPnlPercent: 0,
      updatedAt: now,
    };

    return { account, positions, updatedAt: now };
  }

  /**
   * 更新持仓价格
   */
  updatePositionPrice(symbol: string, newPrice: number): void {
    if (positionSnapshots.size === 0) {
      this.initUserPortfolio('default', this.getDefaultPositionSnapshots());
    }

    positionSnapshots.forEach((snapshots, userId) => {
      const pos = snapshots.find((p) => p.symbol === symbol);
      if (pos) {
        this.broadcastAccountUpdate(userId, (s) => {
          return s.map((snap) => {
            const currentPrice = snap.symbol === symbol ? newPrice : snap.avgPrice;
            const marketValue = snap.quantity * currentPrice;
            const costBasis = snap.quantity * snap.avgPrice;
            const pnl = marketValue - costBasis;
            const pnlPercent = costBasis > 0 ? (pnl / costBasis) * 100 : 0;
            return {
              symbol: snap.symbol,
              quantity: snap.quantity,
              avgPrice: snap.avgPrice,
              currentPrice,
              marketValue,
              pnl,
              pnlPercent,
              updatedAt: Date.now(),
            };
          });
        });
      }
    });
  }

  /**
   * 根据市场数据更新所有用户的持仓
   */
  updateFromMarketData(marketPrices: Map<string, number>): void {
    if (positionSnapshots.size === 0) {
      this.initUserPortfolio('default', this.getDefaultPositionSnapshots());
      logger.info('Portfolio service: auto-initialized default user portfolio');
    }

    positionSnapshots.forEach((snapshots, userId) => {
      let changed = false;
      const updatedPositions: Position[] = snapshots.map((snap) => {
        const currentPrice = marketPrices.get(snap.symbol) ?? snap.avgPrice;
        const marketValue = snap.quantity * currentPrice;
        const costBasis = snap.quantity * snap.avgPrice;
        const pnl = marketValue - costBasis;
        const pnlPercent = costBasis > 0 ? (pnl / costBasis) * 100 : 0;

        if (currentPrice !== snap.avgPrice) {
          changed = true;
        }

        return {
          symbol: snap.symbol,
          quantity: snap.quantity,
          avgPrice: snap.avgPrice,
          currentPrice,
          marketValue,
          pnl,
          pnlPercent,
          updatedAt: Date.now(),
        };
      });

      if (changed) {
        logger.debug(`Portfolio updated for user ${userId}, broadcasting`);
        this.broadcastAccountUpdate(userId, () => updatedPositions);
      }
    });
  }

  /**
   * 获取默认持仓快照
   */
  private getDefaultPositionSnapshots(): PositionSnapshot[] {
    return [
      { symbol: 'AAPL', quantity: 100, avgPrice: 175.50 },
      { symbol: 'GOOGL', quantity: 50, avgPrice: 138.00 },
      { symbol: 'MSFT', quantity: 75, avgPrice: 378.00 },
      { symbol: 'NVDA', quantity: 30, avgPrice: 448.00 },
      { symbol: 'TSLA', quantity: 20, avgPrice: 252.00 },
    ];
  }

  /**
   * 广播账户更新
   */
  private broadcastAccountUpdate(
    userId: string,
    positionUpdater?: (snapshots: PositionSnapshot[]) => Position[]
  ): void {
    const snapshots = positionSnapshots.get(userId);
    if (!snapshots) return;

    const positions = positionUpdater
      ? positionUpdater(snapshots)
      : snapshots.map((snap) => ({
          symbol: snap.symbol,
          quantity: snap.quantity,
          avgPrice: snap.avgPrice,
          currentPrice: snap.avgPrice,
          marketValue: snap.quantity * snap.avgPrice,
          pnl: 0,
          pnlPercent: 0,
          updatedAt: Date.now(),
        }));

    const marketValue = positions.reduce((sum, p) => sum + p.marketValue, 0);
    const totalPnl = positions.reduce((sum, p) => sum + p.pnl, 0);
    const account: AccountInfo = {
      totalAssets: marketValue + 45000,
      availableCash: 45000,
      marketValue,
      frozenCash: 0,
      todayPnl: totalPnl,
      todayPnlPercent: marketValue > 0 ? (totalPnl / marketValue) * 100 : 0,
      updatedAt: Date.now(),
    };

    const portfolio: PortfolioData = {
      account,
      positions,
      updatedAt: Date.now(),
    };

    if (wsServer) {
      // 统一发送到 'default' 频道，所有用户都能收到
      wsServer.broadcast('account:default', portfolio);
    }
  }

  /**
   * 获取最近交易记录
   */
  getRecentTrades(userId: string, limit: number = 10): Trade[] {
    const trades = recentTradeRecords.get(userId);
    if (!trades) {
      return this.getDefaultTrades(userId).slice(0, limit);
    }
    return trades.slice(0, limit);
  }

  /**
   * 获取默认交易记录
   */
  private getDefaultTrades(userId: string): Trade[] {
    const now = Date.now();
    return [
      {
        id: `${userId}-d1`,
        userId,
        symbol: 'NVDA',
        side: 'buy',
        orderType: 'market',
        quantity: 30,
        price: 448.00,
        filledQuantity: 30,
        filledPrice: 448.00,
        commission: 0.3,
        status: 'filled',
        createdAt: new Date(now - 3600000),
        updatedAt: new Date(now - 3600000),
        executedAt: new Date(now - 3600000),
      },
      {
        id: `${userId}-d2`,
        userId,
        symbol: 'TSLA',
        side: 'buy',
        orderType: 'market',
        quantity: 20,
        price: 252.00,
        filledQuantity: 20,
        filledPrice: 252.00,
        commission: 0.2,
        status: 'filled',
        createdAt: new Date(now - 1800000),
        updatedAt: new Date(now - 1800000),
        executedAt: new Date(now - 1800000),
      },
      {
        id: `${userId}-d3`,
        userId,
        symbol: 'AAPL',
        side: 'buy',
        orderType: 'limit',
        quantity: 50,
        price: 174.00,
        filledQuantity: 50,
        filledPrice: 174.00,
        commission: 0.5,
        status: 'filled',
        createdAt: new Date(now - 7200000),
        updatedAt: new Date(now - 7200000),
        executedAt: new Date(now - 7200000),
      },
      {
        id: `${userId}-d4`,
        userId,
        symbol: 'GOOGL',
        side: 'sell',
        orderType: 'market',
        quantity: 10,
        price: 141.80,
        filledQuantity: 10,
        filledPrice: 141.80,
        commission: 0.1,
        status: 'filled',
        createdAt: new Date(now - 10800000),
        updatedAt: new Date(now - 10800000),
        executedAt: new Date(now - 10800000),
      },
      {
        id: `${userId}-d5`,
        userId,
        symbol: 'MSFT',
        side: 'buy',
        orderType: 'market',
        quantity: 25,
        price: 372.50,
        filledQuantity: 25,
        filledPrice: 372.50,
        commission: 0.25,
        status: 'filled',
        createdAt: new Date(now - 14400000),
        updatedAt: new Date(now - 14400000),
        executedAt: new Date(now - 14400000),
      },
    ];
  }

  /**
   * 添加交易记录
   */
  addTrade(userId: string, trade: Trade): void {
    const trades = recentTradeRecords.get(userId) || [];
    trades.unshift(trade);
    // 只保留最近 50 条
    if (trades.length > 50) {
      trades.pop();
    }
    recentTradeRecords.set(userId, trades);
  }
}

export const portfolioService = new PortfolioService();
