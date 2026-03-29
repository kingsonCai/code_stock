"""
风险管理系统
提供仓位控制、止损止盈、资金管理等风控功能
"""
from __future__ import annotations
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional, Callable
from datetime import datetime, timedelta
from decimal import Decimal
from enum import Enum
from loguru import logger


class RiskLevel(Enum):
    """风险等级"""
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class RiskAction(Enum):
    """风控动作"""
    ALLOW = "allow"           # 允许
    WARN = "warn"             # 警告
    REDUCE = "reduce"         # 减仓
    REJECT = "reject"         # 拒绝
    CLOSE_ALL = "close_all"   # 平仓


@dataclass
class RiskEvent:
    """风控事件"""
    level: RiskLevel
    action: RiskAction
    message: str
    symbol: Optional[str] = None
    details: Dict[str, Any] = field(default_factory=dict)
    timestamp: datetime = field(default_factory=datetime.now)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "level": self.level.value,
            "action": self.action.value,
            "message": self.message,
            "symbol": self.symbol,
            "details": self.details,
            "timestamp": self.timestamp.isoformat(),
        }


@dataclass
class PositionInfo:
    """持仓信息"""
    symbol: str
    quantity: Decimal
    entry_price: Decimal
    current_price: Decimal
    unrealized_pnl: Decimal
    market_value: Decimal
    leverage: int = 1
    margin: Decimal = Decimal("0")


@dataclass
class AccountInfo:
    """账户信息"""
    total_equity: Decimal
    cash: Decimal
    margin_used: Decimal
    unrealized_pnl: Decimal
    daily_pnl: Decimal
    positions: List[PositionInfo] = field(default_factory=list)


class RiskRule(ABC):
    """风控规则基类"""

    @property
    @abstractmethod
    def name(self) -> str:
        """规则名称"""
        pass

    @abstractmethod
    def check(self, account: AccountInfo, context: Dict[str, Any]) -> Optional[RiskEvent]:
        """
        检查风控规则

        Args:
            account: 账户信息
            context: 上下文（包含订单信息等）

        Returns:
            如果触发风控，返回 RiskEvent；否则返回 None
        """
        pass


class MaxPositionSizeRule(RiskRule):
    """最大仓位比例规则"""

    def __init__(self, max_position_percent: float = 20.0):
        """
        Args:
            max_position_percent: 单个持仓最大占总权益百分比
        """
        self.max_position_percent = max_position_percent

    @property
    def name(self) -> str:
        return "max_position_size"

    def check(self, account: AccountInfo, context: Dict[str, Any]) -> Optional[RiskEvent]:
        order_value = context.get("order_value", Decimal("0"))
        symbol = context.get("symbol", "")

        if account.total_equity == 0:
            return None

        position_percent = float(order_value / account.total_equity * 100)

        if position_percent > self.max_position_percent:
            return RiskEvent(
                level=RiskLevel.HIGH,
                action=RiskAction.REJECT,
                message=f"仓位比例 {position_percent:.2f}% 超过最大限制 {self.max_position_percent}%",
                symbol=symbol,
                details={
                    "position_percent": position_percent,
                    "max_percent": self.max_position_percent,
                }
            )

        return None


class MaxTotalExposureRule(RiskRule):
    """最大总敞口规则"""

    def __init__(self, max_exposure_percent: float = 80.0):
        """
        Args:
            max_exposure_percent: 总敞口最大占总权益百分比
        """
        self.max_exposure_percent = max_exposure_percent

    @property
    def name(self) -> str:
        return "max_total_exposure"

    def check(self, account: AccountInfo, context: Dict[str, Any]) -> Optional[RiskEvent]:
        order_value = context.get("order_value", Decimal("0"))

        if account.total_equity == 0:
            return None

        # 计算当前总敞口
        current_exposure = sum(abs(p.market_value) for p in account.positions)
        new_exposure = current_exposure + order_value
        exposure_percent = float(new_exposure / account.total_equity * 100)

        if exposure_percent > self.max_exposure_percent:
            return RiskEvent(
                level=RiskLevel.HIGH,
                action=RiskAction.REJECT,
                message=f"总敞口 {exposure_percent:.2f}% 超过最大限制 {self.max_exposure_percent}%",
                details={
                    "exposure_percent": exposure_percent,
                    "max_percent": self.max_exposure_percent,
                    "current_exposure": float(current_exposure),
                }
            )

        return None


class MaxDrawdownRule(RiskRule):
    """最大回撤规则"""

    def __init__(self, max_drawdown_percent: float = 20.0):
        """
        Args:
            max_drawdown_percent: 最大回撤百分比
        """
        self.max_drawdown_percent = max_drawdown_percent
        self.peak_equity: Optional[Decimal] = None

    @property
    def name(self) -> str:
        return "max_drawdown"

    def check(self, account: AccountInfo, context: Dict[str, Any]) -> Optional[RiskEvent]:
        # 更新峰值权益
        if self.peak_equity is None or account.total_equity > self.peak_equity:
            self.peak_equity = account.total_equity

        if self.peak_equity == 0:
            return None

        # 计算回撤
        drawdown = (self.peak_equity - account.total_equity) / self.peak_equity * 100
        drawdown_percent = float(drawdown)

        if drawdown_percent >= self.max_drawdown_percent:
            return RiskEvent(
                level=RiskLevel.CRITICAL,
                action=RiskAction.CLOSE_ALL,
                message=f"回撤 {drawdown_percent:.2f}% 达到最大限制 {self.max_drawdown_percent}%",
                details={
                    "drawdown_percent": drawdown_percent,
                    "max_percent": self.max_drawdown_percent,
                    "peak_equity": float(self.peak_equity),
                    "current_equity": float(account.total_equity),
                }
            )
        elif drawdown_percent >= self.max_drawdown_percent * 0.8:
            return RiskEvent(
                level=RiskLevel.HIGH,
                action=RiskAction.WARN,
                message=f"回撤 {drawdown_percent:.2f}% 接近最大限制",
                details={
                    "drawdown_percent": drawdown_percent,
                    "max_percent": self.max_drawdown_percent,
                }
            )

        return None


class DailyLossLimitRule(RiskRule):
    """日内亏损限制规则"""

    def __init__(self, max_daily_loss_percent: float = 5.0):
        """
        Args:
            max_daily_loss_percent: 最大日内亏损百分比
        """
        self.max_daily_loss_percent = max_daily_loss_percent

    @property
    def name(self) -> str:
        return "daily_loss_limit"

    def check(self, account: AccountInfo, context: Dict[str, Any]) -> Optional[RiskEvent]:
        if account.total_equity == 0:
            return None

        daily_loss_percent = float(account.daily_pnl / account.total_equity * 100)

        if daily_loss_percent <= -self.max_daily_loss_percent:
            return RiskEvent(
                level=RiskLevel.CRITICAL,
                action=RiskAction.CLOSE_ALL,
                message=f"日内亏损 {abs(daily_loss_percent):.2f}% 达到限制",
                details={
                    "daily_loss_percent": daily_loss_percent,
                    "max_loss_percent": -self.max_daily_loss_percent,
                    "daily_pnl": float(account.daily_pnl),
                }
            )
        elif daily_loss_percent <= -self.max_daily_loss_percent * 0.8:
            return RiskEvent(
                level=RiskLevel.HIGH,
                action=RiskAction.WARN,
                message=f"日内亏损 {abs(daily_loss_percent):.2f}% 接近限制",
                details={
                    "daily_loss_percent": daily_loss_percent,
                }
            )

        return None


class MaxLeverageRule(RiskRule):
    """最大杠杆规则"""

    def __init__(self, max_leverage: int = 10):
        """
        Args:
            max_leverage: 最大杠杆倍数
        """
        self.max_leverage = max_leverage

    @property
    def name(self) -> str:
        return "max_leverage"

    def check(self, account: AccountInfo, context: Dict[str, Any]) -> Optional[RiskEvent]:
        leverage = context.get("leverage", 1)
        symbol = context.get("symbol", "")

        if leverage > self.max_leverage:
            return RiskEvent(
                level=RiskLevel.HIGH,
                action=RiskAction.REJECT,
                message=f"杠杆 {leverage}x 超过最大限制 {self.max_leverage}x",
                symbol=symbol,
                details={
                    "leverage": leverage,
                    "max_leverage": self.max_leverage,
                }
            )

        return None


class TradingHoursRule(RiskRule):
    """交易时间规则"""

    def __init__(
        self,
        allowed_hours: Optional[List[int]] = None,
        timezone: str = "UTC"
    ):
        """
        Args:
            allowed_hours: 允许交易的小时列表 (0-23)，None 表示不限制
            timezone: 时区
        """
        self.allowed_hours = allowed_hours
        self.timezone = timezone

    @property
    def name(self) -> str:
        return "trading_hours"

    def check(self, account: AccountInfo, context: Dict[str, Any]) -> Optional[RiskEvent]:
        if self.allowed_hours is None:
            return None

        current_hour = datetime.now().hour

        if current_hour not in self.allowed_hours:
            return RiskEvent(
                level=RiskLevel.MEDIUM,
                action=RiskAction.REJECT,
                message=f"当前时间 {current_hour}:00 不在允许交易时段内",
                details={
                    "current_hour": current_hour,
                    "allowed_hours": self.allowed_hours,
                }
            )

        return None


class RiskManager:
    """
    风险管理器

    管理多个风控规则，提供统一的风控检查接口。
    """

    def __init__(self):
        self.rules: List[RiskRule] = []
        self._event_handlers: List[Callable[[RiskEvent], None]] = []
        self._risk_events: List[RiskEvent] = []
        self._max_events = 100

        # 添加默认规则
        self.add_rule(MaxPositionSizeRule())
        self.add_rule(MaxTotalExposureRule())
        self.add_rule(MaxDrawdownRule())
        self.add_rule(DailyLossLimitRule())
        self.add_rule(MaxLeverageRule())

        logger.info("Risk manager initialized with default rules")

    def add_rule(self, rule: RiskRule) -> None:
        """添加风控规则"""
        self.rules.append(rule)
        logger.info(f"Added risk rule: {rule.name}")

    def remove_rule(self, rule_name: str) -> bool:
        """移除风控规则"""
        for i, rule in enumerate(self.rules):
            if rule.name == rule_name:
                self.rules.pop(i)
                logger.info(f"Removed risk rule: {rule_name}")
                return True
        return False

    def on_event(self, handler: Callable[[RiskEvent], None]) -> None:
        """注册事件处理器"""
        self._event_handlers.append(handler)

    def check_order(
        self,
        account: AccountInfo,
        symbol: str,
        quantity: Decimal,
        price: Decimal,
        leverage: int = 1
    ) -> List[RiskEvent]:
        """
        检查订单风控

        Args:
            account: 账户信息
            symbol: 交易对
            quantity: 数量
            price: 价格
            leverage: 杠杆

        Returns:
            触发的风控事件列表
        """
        context = {
            "symbol": symbol,
            "quantity": quantity,
            "price": price,
            "order_value": abs(quantity * price),
            "leverage": leverage,
        }

        events = []

        for rule in self.rules:
            event = rule.check(account, context)
            if event:
                events.append(event)
                self._record_event(event)

        # 处理事件
        for event in events:
            for handler in self._event_handlers:
                try:
                    handler(event)
                except Exception as e:
                    logger.error(f"Error in risk event handler: {e}")

        return events

    def check_account(self, account: AccountInfo) -> List[RiskEvent]:
        """
        检查账户风控（不涉及订单）

        用于定期检查账户状态。

        Args:
            account: 账户信息

        Returns:
            触发的风控事件列表
        """
        context = {}
        events = []

        for rule in self.rules:
            event = rule.check(account, context)
            if event:
                events.append(event)
                self._record_event(event)

        return events

    def _record_event(self, event: RiskEvent) -> None:
        """记录风控事件"""
        self._risk_events.append(event)

        # 保持事件数量限制
        if len(self._risk_events) > self._max_events:
            self._risk_events.pop(0)

    def get_events(self, limit: int = 20) -> List[RiskEvent]:
        """获取最近的风控事件"""
        return self._risk_events[-limit:]

    def clear_events(self) -> None:
        """清空风控事件记录"""
        self._risk_events.clear()


class StopLossTakeProfitManager:
    """止损止盈管理器"""

    def __init__(self):
        self._orders: Dict[str, Dict[str, Any]] = {}

    def set_stop_loss(
        self,
        position_id: str,
        stop_price: Decimal,
        trailing: bool = False,
        trail_percent: Optional[float] = None
    ) -> None:
        """设置止损"""
        self._orders[position_id] = {
            "stop_loss": stop_price,
            "trailing": trailing,
            "trail_percent": trail_percent,
            "highest_price": stop_price,  # 用于追踪止损
        }
        logger.info(f"Set stop loss for {position_id}: {stop_price}")

    def set_take_profit(self, position_id: str, take_profit_price: Decimal) -> None:
        """设置止盈"""
        if position_id not in self._orders:
            self._orders[position_id] = {}
        self._orders[position_id]["take_profit"] = take_profit_price
        logger.info(f"Set take profit for {position_id}: {take_profit_price}")

    def check(
        self,
        position_id: str,
        current_price: Decimal,
        is_long: bool
    ) -> Optional[Dict[str, Any]]:
        """
        检查是否触发止损止盈

        Args:
            position_id: 持仓ID
            current_price: 当前价格
            is_long: 是否多头

        Returns:
            如果触发，返回动作信息；否则返回 None
        """
        order = self._orders.get(position_id)
        if not order:
            return None

        # 更新追踪止损的最高价
        if order.get("trailing") and order.get("trail_percent"):
            if is_long and current_price > order.get("highest_price", current_price):
                order["highest_price"] = current_price
                trail_amount = current_price * Decimal(str(order["trail_percent"] / 100))
                order["stop_loss"] = current_price - trail_amount
            elif not is_long and current_price < order.get("lowest_price", current_price):
                order["lowest_price"] = current_price
                trail_amount = current_price * Decimal(str(order["trail_percent"] / 100))
                order["stop_loss"] = current_price + trail_amount

        # 检查止损
        stop_loss = order.get("stop_loss")
        if stop_loss:
            if is_long and current_price <= stop_loss:
                return {"action": "stop_loss", "price": float(stop_loss)}
            elif not is_long and current_price >= stop_loss:
                return {"action": "stop_loss", "price": float(stop_loss)}

        # 检查止盈
        take_profit = order.get("take_profit")
        if take_profit:
            if is_long and current_price >= take_profit:
                return {"action": "take_profit", "price": float(take_profit)}
            elif not is_long and current_price <= take_profit:
                return {"action": "take_profit", "price": float(take_profit)}

        return None

    def remove(self, position_id: str) -> None:
        """移除止损止盈设置"""
        if position_id in self._orders:
            del self._orders[position_id]

    def get_orders(self) -> Dict[str, Dict[str, Any]]:
        """获取所有止损止盈设置"""
        return self._orders.copy()
