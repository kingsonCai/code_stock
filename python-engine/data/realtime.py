"""
实时行情推送服务
支持多数据源的行情订阅和分发
"""
from __future__ import annotations
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional, Callable, Awaitable
from datetime import datetime
from decimal import Decimal
import asyncio
import json
from loguru import logger
from enum import Enum


class DataSource(Enum):
    """数据源类型"""
    BINANCE = "binance"
    OKX = "okx"
    MOCK = "mock"


@dataclass
class MarketTick:
    """市场行情快照"""
    symbol: str
    price: Decimal
    bid: Decimal
    ask: Decimal
    volume: Decimal
    timestamp: datetime
    source: DataSource

    def to_dict(self) -> Dict[str, Any]:
        return {
            "symbol": self.symbol,
            "price": float(self.price),
            "bid": float(self.bid),
            "ask": float(self.ask),
            "volume": float(self.volume),
            "timestamp": self.timestamp.isoformat(),
            "source": self.source.value,
        }


@dataclass
class KlineBar:
    """K线数据"""
    symbol: str
    interval: str
    open: Decimal
    high: Decimal
    low: Decimal
    close: Decimal
    volume: Decimal
    open_time: datetime
    close_time: datetime
    source: DataSource

    def to_dict(self) -> Dict[str, Any]:
        return {
            "symbol": self.symbol,
            "interval": self.interval,
            "open": float(self.open),
            "high": float(self.high),
            "low": float(self.low),
            "close": float(self.close),
            "volume": float(self.volume),
            "openTime": self.open_time.isoformat(),
            "closeTime": self.close_time.isoformat(),
            "source": self.source.value,
        }


class MarketDataSubscriber(ABC):
    """行情订阅器基类"""

    @abstractmethod
    async def subscribe_ticker(self, symbol: str, callback: Callable[[MarketTick], Awaitable[None]]) -> None:
        """订阅行情"""
        pass

    @abstractmethod
    async def subscribe_kline(
        self,
        symbol: str,
        interval: str,
        callback: Callable[[KlineBar], Awaitable[None]]
    ) -> None:
        """订阅K线"""
        pass

    @abstractmethod
    async def unsubscribe(self, channel: str) -> None:
        """取消订阅"""
        pass

    @abstractmethod
    async def start(self) -> None:
        """启动订阅器"""
        pass

    @abstractmethod
    async def stop(self) -> None:
        """停止订阅器"""
        pass


class MockMarketDataSubscriber(MarketDataSubscriber):
    """模拟行情订阅器 (用于测试)"""

    def __init__(self):
        self._running = False
        self._tasks: List[asyncio.Task] = []
        self._subscriptions: Dict[str, List[Callable]] = {}
        self._prices: Dict[str, Decimal] = {}

    async def subscribe_ticker(self, symbol: str, callback: Callable[[MarketTick], Awaitable[None]]) -> None:
        """订阅行情"""
        key = f"ticker:{symbol}"
        if key not in self._subscriptions:
            self._subscriptions[key] = []
        self._subscriptions[key].append(callback)

        # 初始化价格
        if symbol not in self._prices:
            self._prices[symbol] = Decimal("100")

        # 启动模拟数据生成
        if not self._running:
            await self.start()

    async def subscribe_kline(
        self,
        symbol: str,
        interval: str,
        callback: Callable[[KlineBar], Awaitable[None]]
    ) -> None:
        """订阅K线"""
        key = f"kline:{symbol}:{interval}"
        if key not in self._subscriptions:
            self._subscriptions[key] = []
        self._subscriptions[key].append(callback)

        if not self._running:
            await self.start()

    async def unsubscribe(self, channel: str) -> None:
        """取消订阅"""
        if channel in self._subscriptions:
            del self._subscriptions[channel]

    async def start(self) -> None:
        """启动订阅器"""
        self._running = True
        logger.info("Mock market data subscriber started")

    async def stop(self) -> None:
        """停止订阅器"""
        self._running = False
        for task in self._tasks:
            task.cancel()
        self._tasks.clear()
        logger.info("Mock market data subscriber stopped")

    async def _generate_tick(self, symbol: str) -> MarketTick:
        """生成模拟行情"""
        import random

        # 随机价格变动
        current_price = self._prices.get(symbol, Decimal("100"))
        change = current_price * Decimal(str(random.uniform(-0.001, 0.001)))
        new_price = current_price + change
        self._prices[symbol] = new_price

        spread = new_price * Decimal("0.0001")

        return MarketTick(
            symbol=symbol,
            price=new_price,
            bid=new_price - spread,
            ask=new_price + spread,
            volume=Decimal(str(random.randint(100, 10000))),
            timestamp=datetime.now(),
            source=DataSource.MOCK,
        )


class MarketDataService:
    """
    市场数据服务

    管理多个数据源，提供统一的行情订阅接口。
    """

    def __init__(self):
        self._subscribers: Dict[DataSource, MarketDataSubscriber] = {}
        self._callbacks: Dict[str, List[Callable]] = {}
        self._cache: Dict[str, MarketTick] = {}
        self._running = False

    def register_subscriber(self, source: DataSource, subscriber: MarketDataSubscriber) -> None:
        """注册数据源订阅器"""
        self._subscribers[source] = subscriber
        logger.info(f"Registered market data subscriber: {source.value}")

    async def subscribe(
        self,
        symbol: str,
        source: DataSource = DataSource.MOCK,
        on_tick: Optional[Callable[[MarketTick], Awaitable[None]]] = None,
        on_kline: Optional[Callable[[KlineBar], Awaitable[None]]] = None,
        interval: str = "1m"
    ) -> None:
        """
        订阅行情

        Args:
            symbol: 交易对
            source: 数据源
            on_tick: 行情回调
            on_kline: K线回调
            interval: K线周期
        """
        subscriber = self._subscribers.get(source)
        if not subscriber:
            logger.warning(f"Subscriber not found for source: {source.value}")
            return

        # 订阅行情
        if on_tick:
            async def tick_wrapper(tick: MarketTick) -> None:
                self._cache[f"{source.value}:{symbol}"] = tick
                await on_tick(tick)

            await subscriber.subscribe_ticker(symbol, tick_wrapper)

        # 订阅K线
        if on_kline:
            await subscriber.subscribe_kline(symbol, interval, on_kline)

        logger.info(f"Subscribed to {symbol} from {source.value}")

    async def unsubscribe(self, symbol: str, source: DataSource) -> None:
        """取消订阅"""
        subscriber = self._subscribers.get(source)
        if subscriber:
            await subscriber.unsubscribe(f"ticker:{symbol}")
            await subscriber.unsubscribe(f"kline:{symbol}")

        # 清除缓存
        cache_key = f"{source.value}:{symbol}"
        if cache_key in self._cache:
            del self._cache[cache_key]

        logger.info(f"Unsubscribed from {symbol} ({source.value})")

    def get_cached_tick(self, symbol: str, source: DataSource = DataSource.MOCK) -> Optional[MarketTick]:
        """获取缓存的行情"""
        return self._cache.get(f"{source.value}:{symbol}")

    async def start(self) -> None:
        """启动所有订阅器"""
        for subscriber in self._subscribers.values():
            await subscriber.start()
        self._running = True
        logger.info("Market data service started")

    async def stop(self) -> None:
        """停止所有订阅器"""
        for subscriber in self._subscribers.values():
            await subscriber.stop()
        self._running = False
        logger.info("Market data service stopped")

    @property
    def is_running(self) -> bool:
        return self._running


class RealtimeQuoteServer:
    """
    实时行情服务器

    作为行情中心，接收来自多个数据源的行情，
    并通过 WebSocket 分发给前端客户端。
    """

    def __init__(self, port: int = 8765):
        self.port = port
        self.market_service = MarketDataService()
        self._clients: List[Any] = []  # WebSocket 客户端
        self._subscribed_symbols: Dict[str, int] = {}  # symbol -> client count
        self._ws_server = None

    async def start(self) -> None:
        """启动服务器"""
        import websockets

        # 注册模拟数据源
        self.market_service.register_subscriber(
            DataSource.MOCK,
            MockMarketDataSubscriber()
        )

        await self.market_service.start()

        # 启动 WebSocket 服务器
        self._ws_server = await websockets.serve(
            self._handle_client,
            "0.0.0.0",
            self.port
        )

        logger.info(f"Realtime quote server started on port {self.port}")

    async def stop(self) -> None:
        """停止服务器"""
        await self.market_service.stop()

        if self._ws_server:
            self._ws_server.close()
            await self._ws_server.wait_closed()

        logger.info("Realtime quote server stopped")

    async def _handle_client(self, websocket: Any, path: str) -> None:
        """处理客户端连接"""
        self._clients.append(websocket)
        client_id = id(websocket)
        logger.info(f"Client connected: {client_id}")

        try:
            async for message in websocket):
                try:
                    data = json.loads(message)
                    await self._handle_message(websocket, data)
                except json.JSONDecodeError:
                    logger.warning(f"Invalid message from client {client_id}")

        except Exception as e:
            logger.error(f"Error handling client {client_id}: {e}")
        finally:
            self._clients.remove(websocket)
            logger.info(f"Client disconnected: {client_id}")

    async def _handle_message(self, websocket: Any, data: Dict) -> None:
        """处理客户端消息"""
        action = data.get("action")
        symbol = data.get("symbol")
        source_str = data.get("source", "mock")
        source = DataSource(source_str)

        if action == "subscribe":
            await self._subscribe_symbol(websocket, symbol, source)

        elif action == "unsubscribe":
            await self._unsubscribe_symbol(websocket, symbol, source)

    async def _subscribe_symbol(self, websocket: Any, symbol: str, source: DataSource) -> None:
        """订阅交易对"""
        # 增加订阅计数
        if symbol not in self._subscribed_symbols:
            self._subscribed_symbols[symbol] = 0
        self._subscribed_symbols[symbol] += 1

        # 首次订阅时启动数据流
        if self._subscribed_symbols[symbol] == 1:
            async def on_tick(tick: MarketTick) -> None:
                await self._broadcast_tick(tick)

            await self.market_service.subscribe(symbol, source, on_tick=on_tick)

        # 发送确认
        await websocket.send(json.dumps({
            "type": "subscribed",
            "symbol": symbol,
            "source": source.value,
        }))

    async def _unsubscribe_symbol(self, websocket: Any, symbol: str, source: DataSource) -> None:
        """取消订阅交易对"""
        if symbol in self._subscribed_symbols:
            self._subscribed_symbols[symbol] -= 1

            # 没有客户端订阅时停止数据流
            if self._subscribed_symbols[symbol] <= 0:
                del self._subscribed_symbols[symbol]
                await self.market_service.unsubscribe(symbol, source)

    async def _broadcast_tick(self, tick: MarketTick) -> None:
        """广播行情到所有客户端"""
        if not self._clients:
            return

        message = json.dumps({
            "type": "tick",
            "data": tick.to_dict(),
        })

        # 并发发送到所有客户端
        await asyncio.gather(
            *[client.send(message) for client in self._clients],
            return_exceptions=True
        )
