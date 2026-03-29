"""
事件定义与事件总线

事件驱动架构的核心模块，用于解耦各个组件之间的通信。
"""
from __future__ import annotations

import time
from dataclasses import dataclass, field
from enum import Enum
from typing import Any, Callable, Dict, List, Optional
from collections import defaultdict
from loguru import logger


class EventType(Enum):
    """事件类型枚举"""
    # 行情事件
    TICK = "tick"                    # 逐笔行情
    BAR = "bar"                      # K线数据
    DEPTH = "depth"                  # 盘口深度

    # 交易事件
    ORDER_NEW = "order_new"          # 新订单
    ORDER_FILLED = "order_filled"    # 订单成交
    ORDER_CANCELLED = "order_cancelled"  # 订单取消
    ORDER_REJECTED = "order_rejected"    # 订单拒绝

    # 账户事件
    POSITION_OPENED = "position_opened"  # 开仓
    POSITION_CLOSED = "position_closed"  # 平仓
    POSITION_UPDATED = "position_updated"  # 持仓更新

    # 策略事件
    SIGNAL = "signal"                # 交易信号
    STRATEGY_START = "strategy_start"  # 策略启动
    STRATEGY_STOP = "strategy_stop"    # 策略停止

    # 系统事件
    TIMER = "timer"                  # 定时器
    ERROR = "error"                  # 错误
    HEARTBEAT = "heartbeat"          # 心跳


@dataclass
class Event:
    """事件基类"""
    type: EventType
    timestamp: float = field(default_factory=time.time)
    data: Dict[str, Any] = field(default_factory=dict)
    source: Optional[str] = None

    def to_dict(self) -> Dict[str, Any]:
        """转换为字典"""
        return {
            "type": self.type.value,
            "timestamp": self.timestamp,
            "data": self.data,
            "source": self.source,
        }


@dataclass
class MarketEvent(Event):
    """市场行情事件"""
    symbol: str = ""
    price: float = 0.0
    volume: float = 0.0

    def __post_init__(self):
        if self.type not in (EventType.TICK, EventType.BAR, EventType.DEPTH):
            self.type = EventType.TICK


@dataclass
class OrderEvent(Event):
    """订单事件"""
    order_id: str = ""
    symbol: str = ""
    side: str = ""  # buy, sell
    order_type: str = ""  # market, limit
    quantity: float = 0.0
    price: Optional[float] = None
    status: str = ""
    filled_quantity: float = 0.0
    filled_price: float = 0.0

    def __post_init__(self):
        if not self.type:
            self.type = EventType.ORDER_NEW


@dataclass
class SignalEvent(Event):
    """交易信号事件"""
    strategy_id: str = ""
    symbol: str = ""
    signal_type: str = ""  # long, short, exit_long, exit_short
    strength: float = 1.0
    stop_loss: Optional[float] = None
    take_profit: Optional[float] = None

    def __post_init__(self):
        self.type = EventType.SIGNAL


# 事件处理器类型
EventHandler = Callable[[Event], None]


class EventBus:
    """
    事件总线

    实现发布-订阅模式，用于组件间解耦通信。
    """

    def __init__(self):
        self._handlers: Dict[EventType, List[EventHandler]] = defaultdict(list)
        self._async_handlers: Dict[EventType, List[Callable]] = defaultdict(list)
        self._event_queue: List[Event] = []
        self._running = False

    def subscribe(
        self,
        event_type: EventType,
        handler: EventHandler,
        is_async: bool = False
    ) -> None:
        """
        订阅事件

        Args:
            event_type: 事件类型
            handler: 事件处理函数
            is_async: 是否为异步处理函数
        """
        if is_async:
            self._async_handlers[event_type].append(handler)
        else:
            self._handlers[event_type].append(handler)
        logger.debug(f"Subscribed handler to event: {event_type.value}")

    def unsubscribe(
        self,
        event_type: EventType,
        handler: EventHandler,
        is_async: bool = False
    ) -> bool:
        """
        取消订阅

        Returns:
            是否成功取消
        """
        target = self._async_handlers if is_async else self._handlers
        try:
            target[event_type].remove(handler)
            return True
        except ValueError:
            return False

    def publish(self, event: Event) -> None:
        """
        发布事件（同步处理）

        将事件放入队列并立即处理同步处理器。
        """
        self._event_queue.append(event)
        self._process_event(event)

    def _process_event(self, event: Event) -> None:
        """处理单个事件"""
        # 处理同步处理器
        for handler in self._handlers[event.type]:
            try:
                handler(event)
            except Exception as e:
                logger.error(f"Error in event handler: {e}")
                self.publish(Event(
                    type=EventType.ERROR,
                    data={"error": str(e), "event": event.to_dict()}
                ))

    async def publish_async(self, event: Event) -> None:
        """
        异步发布事件

        同时处理同步和异步处理器。
        """
        self._event_queue.append(event)

        # 处理同步处理器
        self._process_event(event)

        # 处理异步处理器
        for handler in self._async_handlers[event.type]:
            try:
                await handler(event)
            except Exception as e:
                logger.error(f"Error in async event handler: {e}")

    def clear(self) -> None:
        """清空所有订阅"""
        self._handlers.clear()
        self._async_handlers.clear()
        self._event_queue.clear()

    def get_queue_size(self) -> int:
        """获取事件队列大小"""
        return len(self._event_queue)


# 全局事件总线实例
event_bus = EventBus()
