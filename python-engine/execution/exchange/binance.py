"""
Binance 交易所接口实现
支持现货和合约交易
"""
from __future__ import annotations
from abc import ABC
import hashlib
import hmac
import time
import json
from typing import Any, Dict, List, Optional, Callable, Awaitable
from datetime import datetime
from decimal import Decimal
import asyncio
import aiohttp
import websockets
from loguru import logger

from .base import (
    ExchangeBase, Order, OrderSide, OrderType, OrderStatus,
    Position, Account, Kline, Ticker, TimeInForce
)


class BinanceExchange(ExchangeBase):
    """
    Binance 交易所接口

    支持现货和合约交易，通过 REST API 和 WebSocket 实现完整功能。
    """

    # API 端点
    SPOT_BASE_URL = "https://api.binance.com"
    SPOT_WS_URL = "wss://stream.binance.com:9443/ws"
    FUTURES_BASE_URL = "https://fapi.binance.com"
    FUTURES_WS_URL = "wss://fstream.binance.com/ws"

    # 测试网端点
    SPOT_TESTNET_URL = "https://testnet.binance.vision"
    FUTURES_TESTNET_URL = "https://testnet.binancefuture.com"

    def __init__(
        self,
        api_key: str = "",
        api_secret: str = "",
        futures: bool = True,
        testnet: bool = False
    ):
        """
        初始化 Binance 交易所

        Args:
            api_key: API Key
            api_secret: API Secret
            futures: 是否使用合约
            testnet: 是否使用测试网
        """
        super().__init__(api_key, api_secret)
        self.futures = futures
        self.is_testnet = testnet

        # 设置 API 端点
        if futures:
            self.base_url = self.FUTURES_TESTNET_URL if testnet else self.FUTURES_BASE_URL
            self.ws_url = self.FUTURES_WS_URL
        else:
            self.base_url = self.SPOT_TESTNET_URL if testnet else self.SPOT_BASE_URL
            self.ws_url = self.SPOT_WS_URL

        # HTTP 会话
        self._session: Optional[aiohttp.ClientSession] = None

        # WebSocket 连接
        self._ws: Optional[websockets.WebSocketClientProtocol] = None
        self._ws_task: Optional[asyncio.Task] = None
        self._ws_running = False

        # 订阅管理
        self._subscriptions: Dict[str, List[Callable]] = {}

        logger.info(f"Binance {'Futures' if futures else 'Spot'} exchange initialized")
        if testnet:
            logger.warning("Using TESTNET - Do not use real funds!")

    @property
    def name(self) -> str:
        return "binance"

    @property
    def supported_order_types(self) -> List[OrderType]:
        return [
            OrderType.MARKET,
            OrderType.LIMIT,
            OrderType.STOP_MARKET,
            OrderType.STOP_LIMIT,
            OrderType.TRAILING_STOP,
        ]

    # ==================== 连接管理 ====================

    async def connect(self) -> bool:
        """连接交易所"""
        try:
            # 创建 HTTP 会话
            self._session = aiohttp.ClientSession(
                headers={"X-MBX-APIKEY": self.api_key}
            )

            # 测试连接
            result = await self.test_connection()

            if result:
                self.is_connected = True
                logger.info("Connected to Binance")
            else:
                logger.error("Failed to connect to Binance")

            return result

        except Exception as e:
            logger.error(f"Error connecting to Binance: {e}")
            return False

    async def disconnect(self) -> None:
        """断开连接"""
        self._ws_running = False

        if self._ws_task:
            self._ws_task.cancel()
            self._ws_task = None

        if self._ws:
            await self._ws.close()
            self._ws = None

        if self._session:
            await self._session.close()
            self._session = None

        self.is_connected = False
        logger.info("Disconnected from Binance")

    async def test_connection(self) -> bool:
        """测试连接"""
        try:
            # 尝试获取服务器时间
            async with self._session.get(f"{self.base_url}/api/v3/time") as resp:
                if resp.status == 200:
                    data = await resp.json()
                    server_time = data.get("serverTime", 0)
                    local_time = int(time.time() * 1000)
                    latency = abs(server_time - local_time)
                    logger.debug(f"Binance server latency: {latency}ms")
                    return True
                return False
        except Exception as e:
            logger.error(f"Connection test failed: {e}")
            return False

    # ==================== 签名方法 ====================

    def _sign(self, params: Dict[str, Any]) -> str:
        """生成签名"""
        query_string = "&".join(f"{k}={v}" for k, v in sorted(params.items()))
        signature = hmac.new(
            self.api_secret.encode(),
            query_string.encode(),
            hashlib.sha256
        ).hexdigest()
        return f"{query_string}&signature={signature}"

    def _get_timestamp(self) -> int:
        """获取时间戳"""
        return int(time.time() * 1000)

    # ==================== 账户相关 ====================

    async def get_account(self) -> Account:
        """获取账户信息"""
        params = {"timestamp": self._get_timestamp()}
        url = f"{self.base_url}/fapi/v2/account?{self._sign(params)}"

        async with self._session.get(url) as resp:
            data = await resp.json()

        return Account(
            balance=Decimal(str(data.get("totalWalletBalance", 0))),
            available=Decimal(str(data.get("availableBalance", 0))),
            margin_used=Decimal(str(data.get("totalMaintMargin", 0))),
            unrealized_pnl=Decimal(str(data.get("totalUnrealizedProfit", 0))),
            margin_ratio=Decimal(str(data.get("totalMarginRatio", 0))),
        )

    async def get_balance(self, asset: str = "USDT") -> Decimal:
        """获取资产余额"""
        account = await self.get_account()
        return account.balance

    async def get_positions(self) -> List[Position]:
        """获取所有持仓"""
        params = {"timestamp": self._get_timestamp()}
        url = f"{self.base_url}/fapi/v2/positionRisk?{self._sign(params)}"

        async with self._session.get(url) as resp:
            data = await resp.json()

        positions = []
        for item in data:
            qty = Decimal(str(item.get("positionAmt", 0)))
            if qty != 0:
                positions.append(Position(
                    symbol=item.get("symbol", ""),
                    quantity=qty,
                    entry_price=Decimal(str(item.get("entryPrice", 0))),
                    mark_price=Decimal(str(item.get("markPrice", 0))),
                    unrealized_pnl=Decimal(str(item.get("unRealizedProfit", 0))),
                    leverage=int(item.get("leverage", 1)),
                    liquidation_price=Decimal(str(item.get("liquidationPrice", 0))) if item.get("liquidationPrice") else None,
                ))

        return positions

    async def get_position(self, symbol: str) -> Optional[Position]:
        """获取指定持仓"""
        positions = await self.get_positions()
        for pos in positions:
            if pos.symbol == symbol:
                return pos
        return None

    # ==================== 订单相关 ====================

    async def place_order(self, order: Order) -> Order:
        """下单"""
        params = {
            "symbol": order.symbol,
            "side": "BUY" if order.side == OrderSide.BUY else "SELL",
            "type": order.order_type.value.upper(),
            "quantity": str(order.quantity),
            "timestamp": self._get_timestamp(),
        }

        # 添加价格
        if order.order_type in (OrderType.LIMIT, OrderType.STOP_LIMIT):
            params["price"] = str(order.price)
            params["timeInForce"] = order.time_in_force.value.upper()

        # 添加止损价格
        if order.order_type in (OrderType.STOP_MARKET, OrderType.STOP_LIMIT):
            params["stopPrice"] = str(order.stop_price)

        # 添加客户端订单ID
        if order.client_order_id:
            params["newClientOrderId"] = order.client_order_id

        url = f"{self.base_url}/fapi/v1/order?{self._sign(params)}"

        async with self._session.post(url) as resp:
            data = await resp.json()

        if "code" in data and data["code"] < 0:
            order.status = OrderStatus.REJECTED
            order.metadata["error"] = data.get("msg", "Unknown error")
            return order

        order.exchange_order_id = str(data.get("orderId", ""))
        order.status = OrderStatus.OPEN
        order.updated_at = datetime.now()

        return order

    async def cancel_order(self, symbol: str, order_id: str) -> bool:
        """撤销订单"""
        params = {
            "symbol": symbol,
            "orderId": order_id,
            "timestamp": self._get_timestamp(),
        }

        url = f"{self.base_url}/fapi/v1/order?{self._sign(params)}"

        async with self._session.delete(url) as resp:
            data = await resp.json()

        return data.get("status") == "CANCELED"

    async def cancel_all_orders(self, symbol: Optional[str] = None) -> int:
        """撤销所有订单"""
        params = {"timestamp": self._get_timestamp()}
        if symbol:
            params["symbol"] = symbol

        url = f"{self.base_url}/fapi/v1/allOpenOrders?{self._sign(params)}"

        async with self._session.delete(url) as resp:
            data = await resp.json()

        return data.get("code", 0) == 200

    async def get_order(self, symbol: str, order_id: str) -> Optional[Order]:
        """查询订单"""
        params = {
            "symbol": symbol,
            "orderId": order_id,
            "timestamp": self._get_timestamp(),
        }

        url = f"{self.base_url}/fapi/v1/order?{self._sign(params)}"

        async with self._session.get(url) as resp:
            data = await resp.json()

        return self._parse_order(data)

    async def get_open_orders(self, symbol: Optional[str] = None) -> List[Order]:
        """获取未成交订单"""
        params = {"timestamp": self._get_timestamp()}
        if symbol:
            params["symbol"] = symbol

        url = f"{self.base_url}/fapi/v1/openOrders?{self._sign(params)}"

        async with self._session.get(url) as resp:
            data = await resp.json()

        return [self._parse_order(item) for item in data]

    async def get_order_history(
        self,
        symbol: Optional[str] = None,
        start_time: Optional[datetime] = None,
        end_time: Optional[datetime] = None,
        limit: int = 100
    ) -> List[Order]:
        """获取历史订单"""
        params = {
            "timestamp": self._get_timestamp(),
            "limit": limit,
        }
        if symbol:
            params["symbol"] = symbol
        if start_time:
            params["startTime"] = int(start_time.timestamp() * 1000)
        if end_time:
            params["endTime"] = int(end_time.timestamp() * 1000)

        url = f"{self.base_url}/fapi/v1/allOrders?{self._sign(params)}"

        async with self._session.get(url) as resp:
            data = await resp.json()

        return [self._parse_order(item) for item in data]

    def _parse_order(self, data: Dict) -> Order:
        """解析订单数据"""
        status_map = {
            "NEW": OrderStatus.OPEN,
            "PARTIALLY_FILLED": OrderStatus.PARTIALLY_FILLED,
            "FILLED": OrderStatus.FILLED,
            "CANCELED": OrderStatus.CANCELLED,
            "REJECTED": OrderStatus.REJECTED,
            "EXPIRED": OrderStatus.EXPIRED,
        }

        return Order(
            id=str(data.get("clientOrderId", "")),
            symbol=data.get("symbol", ""),
            side=OrderSide.BUY if data.get("side") == "BUY" else OrderSide.SELL,
            order_type=OrderType(data.get("type", "LIMIT").lower()),
            quantity=Decimal(str(data.get("origQty", 0))),
            price=Decimal(str(data.get("price", 0))) if data.get("price") else None,
            status=status_map.get(data.get("status"), OrderStatus.PENDING),
            filled_quantity=Decimal(str(data.get("executedQty", 0))),
            filled_price=Decimal(str(data.get("avgPrice", 0))) if data.get("avgPrice") else Decimal("0"),
            commission=Decimal("0"),
            exchange_order_id=str(data.get("orderId", "")),
            client_order_id=data.get("clientOrderId", ""),
            created_at=datetime.fromtimestamp(data.get("time", 0) / 1000) if data.get("time") else datetime.now(),
            updated_at=datetime.fromtimestamp(data.get("updateTime", 0) / 1000) if data.get("updateTime") else datetime.now(),
        )

    # ==================== 行情相关 ====================

    async def get_ticker(self, symbol: str) -> Ticker:
        """获取行情"""
        url = f"{self.base_url}/fapi/v1/ticker/24hr?symbol={symbol}"

        async with self._session.get(url) as resp:
            data = await resp.json()

        return Ticker(
            symbol=symbol,
            last_price=Decimal(str(data.get("lastPrice", 0))),
            bid_price=Decimal(str(data.get("bidPrice", 0))),
            bid_quantity=Decimal(str(data.get("bidQty", 0))),
            ask_price=Decimal(str(data.get("askPrice", 0))),
            ask_quantity=Decimal(str(data.get("askQty", 0))),
            high_24h=Decimal(str(data.get("highPrice", 0))),
            low_24h=Decimal(str(data.get("lowPrice", 0))),
            volume_24h=Decimal(str(data.get("volume", 0))),
            quote_volume_24h=Decimal(str(data.get("quoteVolume", 0))),
            price_change_24h=Decimal(str(data.get("priceChange", 0))),
            price_change_percent_24h=Decimal(str(data.get("priceChangePercent", 0))),
        )

    async def get_klines(
        self,
        symbol: str,
        interval: str,
        start_time: Optional[datetime] = None,
        end_time: Optional[datetime] = None,
        limit: int = 500
    ) -> List[Kline]:
        """获取K线数据"""
        params = {
            "symbol": symbol,
            "interval": interval,
            "limit": limit,
        }
        if start_time:
            params["startTime"] = int(start_time.timestamp() * 1000)
        if end_time:
            params["endTime"] = int(end_time.timestamp() * 1000)

        url = f"{self.base_url}/fapi/v1/klines?" + "&".join(f"{k}={v}" for k, v in params.items())

        async with self._session.get(url) as resp:
            data = await resp.json()

        klines = []
        for item in data:
            klines.append(Kline(
                symbol=symbol,
                interval=interval,
                open_time=datetime.fromtimestamp(item[0] / 1000),
                open=Decimal(str(item[1])),
                high=Decimal(str(item[2])),
                low=Decimal(str(item[3])),
                close=Decimal(str(item[4])),
                volume=Decimal(str(item[5])),
                close_time=datetime.fromtimestamp(item[6] / 1000),
                quote_volume=Decimal(str(item[7])),
                trades=item[8],
            ))

        return klines

    async def get_orderbook(self, symbol: str, limit: int = 20) -> Dict[str, Any]:
        """获取订单簿"""
        url = f"{self.base_url}/fapi/v1/depth?symbol={symbol}&limit={limit}"

        async with self._session.get(url) as resp:
            data = await resp.json()

        return {
            "bids": [(Decimal(str(b[0])), Decimal(str(b[1]))) for b in data.get("bids", [])],
            "asks": [(Decimal(str(a[0])), Decimal(str(a[1]))) for a in data.get("asks", [])],
            "lastUpdateId": data.get("lastUpdateId", 0),
        }

    # ==================== WebSocket 订阅 ====================

    async def _ws_loop(self) -> None:
        """WebSocket 主循环"""
        while self._ws_running:
            try:
                async with websockets.connect(self.ws_url) as ws:
                    self._ws = ws
                    logger.info("WebSocket connected")

                    # 发送订阅请求
                    for channel, callbacks in self._subscriptions.items():
                        subscribe_msg = {
                            "method": "SUBSCRIBE",
                            "params": [channel],
                            "id": int(time.time() * 1000)
                        }
                        await ws.send(json.dumps(subscribe_msg))

                    # 接收消息
                    async for message in ws:
                        try:
                            data = json.loads(message)
                            await self._handle_ws_message(data)
                        except Exception as e:
                            logger.error(f"Error handling WS message: {e}")

            except Exception as e:
                logger.error(f"WebSocket error: {e}")
                if self._ws_running:
                    await asyncio.sleep(5)  # 重连延迟

    async def _handle_ws_message(self, data: Dict) -> None:
        """处理 WebSocket 消息"""
        # 处理行情更新
        if "e" in data:
            event_type = data.get("e")

            if event_type == "24hrTicker":
                ticker = Ticker(
                    symbol=data.get("s", ""),
                    last_price=Decimal(str(data.get("c", 0))),
                    bid_price=Decimal(str(data.get("b", 0))),
                    bid_quantity=Decimal(str(data.get("B", 0))),
                    ask_price=Decimal(str(data.get("a", 0))),
                    ask_quantity=Decimal(str(data.get("A", 0))),
                    high_24h=Decimal(str(data.get("h", 0))),
                    low_24h=Decimal(str(data.get("l", 0))),
                    volume_24h=Decimal(str(data.get("v", 0))),
                    quote_volume_24h=Decimal(str(data.get("q", 0))),
                    price_change_24h=Decimal(str(data.get("p", 0))),
                    price_change_percent_24h=Decimal(str(data.get("P", 0))),
                )

                channel = f"{data.get('s', '').lower()}@ticker"
                if channel in self._subscriptions:
                    for callback in self._subscriptions[channel]:
                        await callback(ticker)

            elif event_type == "kline":
                kline_data = data.get("k", {})
                kline = Kline(
                    symbol=kline_data.get("s", ""),
                    interval=kline_data.get("i", ""),
                    open_time=datetime.fromtimestamp(kline_data.get("t", 0) / 1000),
                    open=Decimal(str(kline_data.get("o", 0))),
                    high=Decimal(str(kline_data.get("h", 0))),
                    low=Decimal(str(kline_data.get("l", 0))),
                    close=Decimal(str(kline_data.get("c", 0))),
                    volume=Decimal(str(kline_data.get("v", 0))),
                    close_time=datetime.fromtimestamp(kline_data.get("T", 0) / 1000),
                    quote_volume=Decimal(str(kline_data.get("q", 0))),
                    trades=kline_data.get("n", 0),
                )

                channel = f"{kline_data.get('s', '').lower()}@kline_{kline_data.get('i', '')}"
                if channel in self._subscriptions:
                    for callback in self._subscriptions[channel]:
                        await callback(kline)

    async def subscribe_ticker(self, symbol: str, callback: Callable[[Ticker], Awaitable[None]]) -> None:
        """订阅行情"""
        channel = f"{symbol.lower()}@ticker"

        if channel not in self._subscriptions:
            self._subscriptions[channel] = []
        self._subscriptions[channel].append(callback)

        if not self._ws_task:
            self._ws_running = True
            self._ws_task = asyncio.create_task(self._ws_loop())

    async def subscribe_kline(
        self,
        symbol: str,
        interval: str,
        callback: Callable[[Kline], Awaitable[None]]
    ) -> None:
        """订阅K线"""
        channel = f"{symbol.lower()}@kline_{interval}"

        if channel not in self._subscriptions:
            self._subscriptions[channel] = []
        self._subscriptions[channel].append(callback)

        if not self._ws_task:
            self._ws_running = True
            self._ws_task = asyncio.create_task(self._ws_loop())

    async def subscribe_order(self, callback: Callable[[Order], Awaitable[None]]) -> None:
        """订阅订单更新"""
        # 需要使用用户数据流
        listen_key = await self._get_listen_key()

        channel = listen_key
        if channel not in self._subscriptions:
            self._subscriptions[channel] = []
        self._subscriptions[channel].append(callback)

        if not self._ws_task:
            self._ws_running = True
            self._ws_task = asyncio.create_task(self._ws_loop())

    async def _get_listen_key(self) -> str:
        """获取 Listen Key"""
        url = f"{self.base_url}/fapi/v1/listenKey"

        async with self._session.post(url) as resp:
            data = await resp.json()

        return data.get("listenKey", "")

    async def unsubscribe(self, channel: str, symbol: Optional[str] = None) -> None:
        """取消订阅"""
        if channel in self._subscriptions:
            del self._subscriptions[channel]

        if self._ws:
            unsubscribe_msg = {
                "method": "UNSUBSCRIBE",
                "params": [channel],
                "id": int(time.time() * 1000)
            }
            await self._ws.send(json.dumps(unsubscribe_msg))
