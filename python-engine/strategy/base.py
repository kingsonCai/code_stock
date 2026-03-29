"""
策略基类

所有用户策略都应该继承此基类。
"""
from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional
from enum import Enum
from loguru import logger

from core.event import Event, EventType, event_bus


class StrategyStatus(Enum):
    """策略状态"""
    CREATED = "created"
    RUNNING = "running"
    PAUSED = "paused"
    STOPPED = "stopped"


@dataclass
class Position:
    """持仓信息"""
    symbol: str
    quantity: float = 0.0
    avg_price: float = 0.0
    current_price: float = 0.0
    unrealized_pnl: float = 0.0
    realized_pnl: float = 0.0

    def update_price(self, price: float) -> None:
        """更新当前价格"""
        self.current_price = price
        if self.quantity != 0:
            self.unrealized_pnl = (price - self.avg_price) * self.quantity

    def add_position(self, quantity: float, price: float) -> None:
        """增加持仓"""
        if self.quantity * quantity > 0:  # 同向加仓
            total_cost = self.avg_price * abs(self.quantity) + price * abs(quantity)
            total_qty = abs(self.quantity) + abs(quantity)
            self.avg_price = total_cost / total_qty if total_qty > 0 else 0
        else:  # 反向平仓
            if abs(quantity) >= abs(self.quantity):
                # 完全平仓或反向开仓
                self.realized_pnl += (price - self.avg_price) * self.quantity
                self.avg_price = price
            else:
                # 部分平仓
                self.realized_pnl += (price - self.avg_price) * quantity

        self.quantity += quantity
        self.update_price(price)

    @property
    def is_long(self) -> bool:
        return self.quantity > 0

    @property
    def is_short(self) -> bool:
        return self.quantity < 0

    @property
    def is_flat(self) -> bool:
        return self.quantity == 0


@dataclass
class Portfolio:
    """投资组合"""
    initial_capital: float = 100000.0
    cash: float = 100000.0
    positions: Dict[str, Position] = field(default_factory=dict)

    @property
    def total_value(self) -> float:
        """总资产"""
        position_value = sum(
            pos.quantity * pos.current_price
            for pos in self.positions.values()
        )
        return self.cash + position_value

    @property
    def total_pnl(self) -> float:
        """总盈亏"""
        return self.total_value - self.initial_capital

    @property
    def total_pnl_percent(self) -> float:
        """总盈亏百分比"""
        if self.initial_capital == 0:
            return 0
        return (self.total_value - self.initial_capital) / self.initial_capital * 100

    def get_position(self, symbol: str) -> Position:
        """获取或创建持仓"""
        if symbol not in self.positions:
            self.positions[symbol] = Position(symbol=symbol)
        return self.positions[symbol]

    def update_position(self, symbol: str, quantity: float, price: float) -> None:
        """更新持仓"""
        position = self.get_position(symbol)
        old_quantity = position.quantity

        # 更新持仓
        position.add_position(quantity, price)

        # 更新现金
        self.cash -= quantity * price


@dataclass
class Context:
    """
    策略上下文

    策略运行时的上下文环境，包含投资组合、配置等信息。
    """
    portfolio: Portfolio = field(default_factory=Portfolio)
    config: Dict[str, Any] = field(default_factory=dict)
    _orders: List[Dict[str, Any]] = field(default_factory=list)

    def order(
        self,
        symbol: str,
        quantity: float,
        order_type: str = "market",
        price: Optional[float] = None,
        stop_price: Optional[float] = None,
    ) -> str:
        """
        下单

        Args:
            symbol: 交易标的
            quantity: 数量（正数买入，负数卖出）
            order_type: 订单类型 (market, limit, stop)
            price: 限价单价格
            stop_price: 止损单触发价格

        Returns:
            订单ID
        """
        import uuid
        order_id = str(uuid.uuid4())[:8]

        order = {
            "id": order_id,
            "symbol": symbol,
            "quantity": quantity,
            "type": order_type,
            "price": price,
            "stop_price": stop_price,
            "status": "pending",
        }
        self._orders.append(order)

        logger.info(f"Order placed: {order_id} {symbol} {quantity}@{price or 'market'}")
        return order_id

    def order_target_percent(
        self,
        symbol: str,
        target_percent: float,
    ) -> str:
        """
        调整仓位到目标百分比

        Args:
            symbol: 交易标的
            target_percent: 目标仓位百分比 (0-1)
        """
        current_value = self.portfolio.get_position(symbol).quantity * \
                       self.portfolio.get_position(symbol).current_price
        target_value = self.portfolio.total_value * target_percent
        diff_value = target_value - current_value

        # 简化实现，假设可以按当前价格交易
        price = self.portfolio.get_position(symbol).current_price
        if price > 0:
            quantity = diff_value / price
            return self.order(symbol, quantity)

        return ""

    @property
    def orders(self) -> List[Dict[str, Any]]:
        """获取所有订单"""
        return self._orders.copy()


class StrategyBase(ABC):
    """
    策略基类

    所有用户策略都必须继承此类并实现以下方法：
    - initialize(context): 初始化策略配置
    - handle_data(context, data): 处理数据并生成交易信号
    """

    def __init__(self, strategy_id: str = ""):
        self.strategy_id = strategy_id or self.__class__.__name__
        self.status = StrategyStatus.CREATED
        self.context = Context()
        self._subscribed_symbols: List[str] = []
        self._initialized = False

    @abstractmethod
    def initialize(self, context: Context) -> None:
        """
        初始化策略

        在此方法中设置策略参数、订阅交易标的等。

        Args:
            context: 策略上下文
        """
        pass

    @abstractmethod
    def handle_data(self, context: Context, data: Any) -> None:
        """
        处理数据

        每个交易周期调用一次，在此方法中实现交易逻辑。

        Args:
            context: 策略上下文
            data: 当前周期的数据
        """
        pass

    def before_trading_start(self, context: Context) -> None:
        """
        开盘前执行

        每日开盘前调用一次，可用于设置日内参数。
        """
        pass

    def after_trading_end(self, context: Context) -> None:
        """
        收盘后执行

        每日收盘后调用一次，可用于统计当日表现。
        """
        pass

    def on_error(self, context: Context, error: Exception) -> None:
        """
        错误处理

        策略运行出错时调用。
        """
        logger.error(f"Strategy {self.strategy_id} error: {error}")

    def start(self) -> None:
        """启动策略"""
        if self.status == StrategyStatus.RUNNING:
            return

        if not self._initialized:
            self.initialize(self.context)
            self._initialized = True

        self.status = StrategyStatus.RUNNING
        event_bus.publish(Event(
            type=EventType.STRATEGY_START,
            data={"strategy_id": self.strategy_id},
            source=self.strategy_id,
        ))
        logger.info(f"Strategy {self.strategy_id} started")

    def stop(self) -> None:
        """停止策略"""
        self.status = StrategyStatus.STOPPED
        event_bus.publish(Event(
            type=EventType.STRATEGY_STOP,
            data={"strategy_id": self.strategy_id},
            source=self.strategy_id,
        ))
        logger.info(f"Strategy {self.strategy_id} stopped")

    def pause(self) -> None:
        """暂停策略"""
        self.status = StrategyStatus.PAUSED
        logger.info(f"Strategy {self.strategy_id} paused")

    def resume(self) -> None:
        """恢复策略"""
        if self.status == StrategyStatus.PAUSED:
            self.status = StrategyStatus.RUNNING
            logger.info(f"Strategy {self.strategy_id} resumed")

    @property
    def symbols(self) -> List[str]:
        """获取订阅的交易标的"""
        return self._subscribed_symbols.copy()

    def subscribe(self, symbol: str) -> None:
        """订阅交易标的"""
        if symbol not in self._subscribed_symbols:
            self._subscribed_symbols.append(symbol)

    def subscribe_all(self, symbols: List[str]) -> None:
        """批量订阅"""
        for symbol in symbols:
            self.subscribe(symbol)

    def get_info(self) -> Dict[str, Any]:
        """获取策略信息"""
        return {
            "strategy_id": self.strategy_id,
            "status": self.status.value,
            "symbols": self._subscribed_symbols,
            "portfolio": {
                "total_value": self.context.portfolio.total_value,
                "cash": self.context.portfolio.cash,
                "pnl": self.context.portfolio.total_pnl,
                "pnl_percent": self.context.portfolio.total_pnl_percent,
            },
        }
