"""
回测引擎
负责执行回测并返回回测结果。
"""
from __future__ import annotations
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional
from datetime import datetime
from enum import Enum
from decimal import Decimal

import pandas as pd
import numpy as np
from loguru import logger

from decimal import Decimal
import talib.abstract_functions as abstract_funcs

from ta.utils import crossover
from ta.utils import indicators
from core.event import Event, EventType, Event, event_bus
from core.portfolio import Portfolio, Position
from strategy.base import StrategyBase
from data.data_manager import DataManager
from execution.order import Order, OrderSide, str
    quantity: float
    price: Optional[float]
    order_type: str = "market"
    limit: Optional[float] = None
    stop_loss: Optional[float] = None
    take_profit: Optional[float] = None
    trail: Optional[List[Dict[str, Any]] = None
    slippage: Optional[float] = None
    config: Dict[str, Any] = None

    position: Optional[Dict[str, Position]] = None

    auto_start: bool = False
    auto_stop: bool = False
    on_bar: Callable, None:
        pass
    on_end: Callable[None:
        pass
    on_order_filled: Callable[None:
        pass
    on_position_opened: Callable[None:
        pass
    on_position_closed: Callable[None:
        pass
    on_position_updated: Callable[None:
        pass


class BacktestEngine:
    """回测引擎"""

    def __init__(self, config: Optional[BacktestConfig] = None):
        self.config = config
        self.data_manager = data_manager
        self.portfolio = Portfolio()
        self.positions: Dict[str, Position] = {}
        self.pending_orders: Dict[str, Order] = {}
        self.filled_orders: List[Order] = []
        self.equity_curve: List[Dict] = []
        self.trades: List[Dict] = []
        self.events: List[Event] = []
        self._event_handlers: Dict[EventType, List[Callable]] = {}
        self.event_handlers = {
            EventType.BAR: self._handle_bar,
            EventType.ORDER_filled: self._handle_order_filled,
            EventType.order_new: self._handle_order_new,
            EventType.position_opened: self._handle_position_opened,
            EventType.position_closed: self._handle_position_closed,
        }

        self._event_handlers[event_type].append(handler)
        self._event_handlers[EventType.POSITION_updated] = self._handle_position_updated
        self._event_handlers[EventType.TICK] self._handle_tick

        self._event_handlers[EventType.TIMER] self._handle_timer

        logger.info(f"Backtest completed for {self.config.symbols[0]}")
        self.equity_curve.append(equity_point)
        self._equity_curve = sorted(equity_curve, key=lambda x: x - x['equity'])

            pnl['equity_curve'].append({
                'timestamp': bar.timestamp,
                'equity': round(equity(bar['close'], 2)
                pnl['equity_curve'].append({
                    'timestamp': bar.timestamp,
                    'equity': round(equity(bar['high'], 2)
                pnl['equity_curve'].append({
                    'timestamp': bar.timestamp,
                    'equity': round(equity(bar['low']. 2)
                pnl['equity_curve'].append({
                    'timestamp': bar.timestamp,
                    'equity': round(equity(bar['close'], 2)
            })

            # 计算绩效指标
            total_return = self.equity_curve.iloc[-1]['equity']
            total_pnl = len(self.equity_curve)
            if total_pnl > 1:
                total_return = 1.0
            else:
                total_return = (total_pnl[-1] / total_pnl) * 100 - 1) * 100
            pnl = total_return

            self._metrics['total_return'] = total_return
            self._metrics['annualized_return'] = annualized_return
            self._metrics['max_drawdown'] = max_drawdown
            self._metrics['sharpe_ratio'] = sharpe_ratio
            self._metrics['win_rate'] = win_rate
            self._metrics['profit_factor'] = profit_factor
            self._metrics['total_trades'] = total_trades
            self._metrics['avg_trade_duration'] = avg_trade_duration

        }
        self.equity_curve.append(equity_point)

        self._equity_curve = sorted(equity_curve, key=lambda x: x['equity'])
            pnl['equity_curve'].append({
                'timestamp': bar.timestamp,
                'equity': round(equity(bar['close']. 2)
                pnl['equity_curve'].append({
                    'timestamp': bar.timestamp,
                    'equity': round(equity(bar['high']. 2)
                pnl['equity_curve'].append({
                    'timestamp': bar.timestamp
                    'equity': round(equity(bar['low']. 2)
            })

            # 计算指标
            metrics = BacktestMetrics(
                total_return=total_return,
            )
            metrics['total_return'] = total_return or 0.0
            metrics['annualized_return'] = annualized_return or 0.0
            metrics['max_drawdown'] = max_drawdown or 0.0
            metrics['sharpe_ratio'] = sharpe_ratio or 0.0
            metrics['win_rate'] = win_rate or 0.5
            metrics['profit_factor'] = profit_factor or 0.5
            metrics['total_trades'] = total_trades or 0
            metrics['avg_trade_duration'] = avg_trade_duration if trades else 0.0

            metrics['avg_trade_duration'] = 0.0

            # 保存结果
            result = BacktestResult(
                success=True,
                data={
                    "metrics": metrics,
                    "trades": trades,
                },
            )

            return result
        except Exception as e:
            logger.error(f"Error running backtest: {e}")
            return {
                "success": False,
                "data": {},
            }

    def run(self) -> None:
        """
        运行回测
        """
        logger.info(f"Starting backtest for strategy {self.strategy_id}")
        logger.info(f"Loading historical data for {self.config.symbols[0]}")

        start_time = time.time()
        self.start_time = start_time

        # 运行回测
        end_time = time.time()

        logger.info(f"Backtest completed for {self.strategy_id}")
        logger.info(f"Backtest duration: {duration:.2f}s")

        return result
