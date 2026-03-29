"""
交易所基类 - 定义交易所接口规范
"""
from __future__ import annotations
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional, Callable, Awaitable
from enum import Enum
from datetime import datetime
from decimal import Decimal
from loguru import logger


class OrderSide(Enum):
    """订单方向"""
    BUY = "buy"
    SELL = "sell"


class OrderType(Enum):
    """订单类型"""
    MARKET = "market"
    LIMIT = "limit"
    STOP_MARKET = "stop_market"
    STOP_LIMIT = "stop_limit"
    TRAILING_STOP = "trailing_stop"


class OrderStatus(Enum):
    """订单状态"""
    PENDING = "pending"
    OPEN = "open"
    PARTIALLY_FILLED = "partially_filled"
    FILLED = "filled"
    CANCELLED = "cancelled"
    REJECTED = "rejected"
    EXPIRED = "expired"


class TimeInForce(Enum):
    """订单有效期"""
    GTC = "good_till_cancelled"  # 直到取消
    IOC = "immediate_or_cancel"  # 立即成交或取消
    FOK = "fill_or_kill"         # 全部成交或取消
    GTX = "good_till_crossing"   # 只做 Maker


@dataclass
class Order:
    """订单对象"""
    id: str
    symbol: str
    side: OrderSide
    order_type: OrderType
    quantity: Decimal
    price: Optional[Decimal] = None
    stop_price: Optional[Decimal] = None
    status: OrderStatus = OrderStatus.PENDING
    filled_quantity: Decimal = Decimal("0")
    filled_price: Decimal = Decimal("0")
    commission: Decimal = Decimal("0")
    commission_asset: str = ""
    created_at: datetime = field(default_factory=datetime.now)
    updated_at: datetime = field(default_factory=datetime.now)
    exchange_order_id: str = ""
    client_order_id: str = ""
    time_in_force: TimeInForce = TimeInForce.GTC
    reduce_only: bool = False
    post_only: bool = False
    metadata: Dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> Dict[str, Any]:
        """转换为字典"""
        return {
            "id": self.id,
            "symbol": self.symbol,
            "side": self.side.value,
            "type": self.order_type.value,
            "quantity": str(self.quantity),
            "price": str(self.price) if self.price else None,
            "stopPrice": str(self.stop_price) if self.stop_price else None,
            "status": self.status.value,
            "filledQuantity": str(self.filled_quantity),
            "filledPrice": str(self.filled_price),
            "commission": str(self.commission),
            "commissionAsset": self.commission_asset,
            "createdAt": self.created_at.isoformat(),
            "updatedAt": self.updated_at.isoformat(),
            "exchangeOrderId": self.exchange_order_id,
            "clientOrderId": self.client_order_id,
        }


@dataclass
class Position:
    """持仓对象"""
    symbol: str
    quantity: Decimal = Decimal("0")
    entry_price: Decimal = Decimal("0")
    mark_price: Decimal = Decimal("0")
    unrealized_pnl: Decimal = Decimal("0")
    realized_pnl: Decimal = Decimal("0")
    leverage: int = 1
    margin: Decimal = Decimal("0")
    liquidation_price: Optional[Decimal] = None
    updated_at: datetime = field(default_factory=datetime.now)

    @property
    def is_long(self) -> bool:
        return self.quantity > 0

    @property
    def is_short(self) -> bool:
        return self.quantity < 0

    @property
    def is_flat(self) -> bool:
        return self.quantity == 0

    def update_pnl(self, mark_price: Decimal) -> None:
        """更新盈亏"""
        self.mark_price = mark_price
        if self.quantity != 0:
            self.unrealized_pnl = (mark_price - self.entry_price) * self.quantity


@dataclass
class Account:
    """账户信息"""
    balance: Decimal = Decimal("0")
    available: Decimal = Decimal("0")
    margin_used: Decimal = Decimal("0")
    unrealized_pnl: Decimal = Decimal("0")
    margin_ratio: Decimal = Decimal("0")

    @property
    def equity(self) -> Decimal:
        return self.balance + self.unrealized_pnl

    @property
    def free_margin(self) -> Decimal:
        return self.equity - self.margin_used

    @property
    def margin_level(self) -> Decimal:
        if self.margin_used == 0:
            return Decimal("0")
        return (self.equity / self.margin_used) * 100


@dataclass
class Kline:
    """K线数据"""
    symbol: str
    interval: str
    open_time: datetime
    open: Decimal
    high: Decimal
    low: Decimal
    close: Decimal
    volume: Decimal
    close_time: datetime
    quote_volume: Decimal = Decimal("0")
    trades: int = 0

    def to_dict(self) -> Dict[str, Any]:
        return {
            "symbol": self.symbol,
            "interval": self.interval,
            "openTime": self.open_time.isoformat(),
            "open": str(self.open),
            "high": str(self.high),
            "low": str(self.low),
            "close": str(self.close),
            "volume": str(self.volume),
            "closeTime": self.close_time.isoformat(),
            "quoteVolume": str(self.quote_volume),
            "trades": self.trades,
        }


@dataclass
class Ticker:
    """行情数据"""
    symbol: str
    last_price: Decimal
    bid_price: Decimal
    bid_quantity: Decimal
    ask_price: Decimal
    ask_quantity: Decimal
    high_24h: Decimal
    low_24h: Decimal
    volume_24h: Decimal
    quote_volume_24h: Decimal
    price_change_24h: Decimal
    price_change_percent_24h: Decimal
    timestamp: datetime = field(default_factory=datetime.now)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "symbol": self.symbol,
            "lastPrice": str(self.last_price),
            "bidPrice": str(self.bid_price),
            "bidQuantity": str(self.bid_quantity),
            "askPrice": str(self.ask_price),
            "askQuantity": str(self.ask_quantity),
            "high24h": str(self.high_24h),
            "low24h": str(self.low_24h),
            "volume24h": str(self.volume_24h),
            "quoteVolume24h": str(self.quote_volume_24h),
            "priceChange24h": str(self.price_change_24h),
            "priceChangePercent24h": str(self.price_change_percent_24h),
            "timestamp": self.timestamp.isoformat(),
        }


class ExchangeBase(ABC):
    """
    交易所基类

    所有交易所接口都必须实现此基类定义的方法。
    """

    def __init__(self, api_key: str = "", api_secret: str = "", passphrase: str = ""):
        """
        初始化交易所

        Args:
            api_key: API Key
            api_secret: API Secret
            passphrase: API Passphrase (部分交易所需要)
        """
        self.api_key = api_key
        self.api_secret = api_secret
        self.passphrase = passphrase
        self.is_connected = False
        self.is_testnet = False
        self._ws_callbacks: Dict[str, List[Callable]] = {}

    @property
    @abstractmethod
    def name(self) -> str:
        """交易所名称"""
        pass

    @property
    @abstractmethod
    def supported_order_types(self) -> List[OrderType]:
        """支持的订单类型"""
        pass

    # ==================== 连接管理 ====================

    @abstractmethod
    async def connect(self) -> bool:
        """
        连接交易所

        Returns:
            是否连接成功
        """
        pass

    @abstractmethod
    async def disconnect(self) -> None:
        """断开连接"""
        pass

    @abstractmethod
    async def test_connection(self) -> bool:
        """
        测试连接

        Returns:
            连接是否正常
        """
        pass

    # ==================== 账户相关 ====================

    @abstractmethod
    async def get_account(self) -> Account:
        """
        获取账户信息

        Returns:
            账户信息
        """
        pass

    @abstractmethod
    async def get_balance(self, asset: str = "USDT") -> Decimal:
        """
        获取资产余额

        Args:
            asset: 资产名称

        Returns:
            余额
        """
        pass

    @abstractmethod
    async def get_positions(self) -> List[Position]:
        """
        获取所有持仓

        Returns:
            持仓列表
        """
        pass

    @abstractmethod
    async def get_position(self, symbol: str) -> Optional[Position]:
        """
        获取指定持仓

        Args:
            symbol: 交易对

        Returns:
            持仓信息
        """
        pass

    # ==================== 订单相关 ====================

    @abstractmethod
    async def place_order(self, order: Order) -> Order:
        """
        下单

        Args:
            order: 订单对象

        Returns:
            更新后的订单对象
        """
        pass

    @abstractmethod
    async def cancel_order(self, symbol: str, order_id: str) -> bool:
        """
        撤销订单

        Args:
            symbol: 交易对
            order_id: 订单ID

        Returns:
            是否撤销成功
        """
        pass

    @abstractmethod
    async def cancel_all_orders(self, symbol: Optional[str] = None) -> int:
        """
        撤销所有订单

        Args:
            symbol: 交易对（可选，不指定则撤销所有）

        Returns:
            撤销的订单数量
        """
        pass

    @abstractmethod
    async def get_order(self, symbol: str, order_id: str) -> Optional[Order]:
        """
        查询订单

        Args:
            symbol: 交易对
            order_id: 订单ID

        Returns:
            订单信息
        """
        pass

    @abstractmethod
    async def get_open_orders(self, symbol: Optional[str] = None) -> List[Order]:
        """
        获取未成交订单

        Args:
            symbol: 交易对（可选）

        Returns:
            订单列表
        """
        pass

    @abstractmethod
    async def get_order_history(
        self,
        symbol: Optional[str] = None,
        start_time: Optional[datetime] = None,
        end_time: Optional[datetime] = None,
        limit: int = 100
    ) -> List[Order]:
        """
        获取历史订单

        Args:
            symbol: 交易对
            start_time: 开始时间
            end_time: 结束时间
            limit: 返回数量限制

        Returns:
            订单列表
        """
        pass

    # ==================== 行情相关 ====================

    @abstractmethod
    async def get_ticker(self, symbol: str) -> Ticker:
        """
        获取行情

        Args:
            symbol: 交易对

        Returns:
            行情数据
        """
        pass

    @abstractmethod
    async def get_klines(
        self,
        symbol: str,
        interval: str,
        start_time: Optional[datetime] = None,
        end_time: Optional[datetime] = None,
        limit: int = 500
    ) -> List[Kline]:
        """
        获取K线数据

        Args:
            symbol: 交易对
            interval: K线周期
            start_time: 开始时间
            end_time: 结束时间
            limit: 返回数量限制

        Returns:
            K线列表
        """
        pass

    @abstractmethod
    async def get_orderbook(self, symbol: str, limit: int = 20) -> Dict[str, Any]:
        """
        获取订单簿

        Args:
            symbol: 交易对
            limit: 深度限制

        Returns:
            订单簿数据
        """
        pass

    # ==================== WebSocket 订阅 ====================

    @abstractmethod
    async def subscribe_ticker(self, symbol: str, callback: Callable[[Ticker], Awaitable[None]]) -> None:
        """
        订阅行情

        Args:
            symbol: 交易对
            callback: 回调函数
        """
        pass

    @abstractmethod
    async def subscribe_kline(
        self,
        symbol: str,
        interval: str,
        callback: Callable[[Kline], Awaitable[None]]
    ) -> None:
        """
        订阅K线

        Args:
            symbol: 交易对
            interval: K线周期
            callback: 回调函数
        """
        pass

    @abstractmethod
    async def subscribe_order(self, callback: Callable[[Order], Awaitable[None]]) -> None:
        """
        订阅订单更新

        Args:
            callback: 回调函数
        """
        pass

    @abstractmethod
    async def unsubscribe(self, channel: str, symbol: Optional[str] = None) -> None:
        """
        取消订阅

        Args:
            channel: 频道名称
            symbol: 交易对
        """
        pass

    # ==================== 工具方法 ====================

    def set_testnet(self, is_testnet: bool = True) -> None:
        """设置是否使用测试网"""
        self.is_testnet = is_testnet
        logger.info(f"{self.name} testnet mode: {is_testnet}")

    def _generate_client_order_id(self) -> str:
        """生成客户端订单ID"""
        import uuid
        return f"qt_{uuid.uuid4().hex[:16]}"
