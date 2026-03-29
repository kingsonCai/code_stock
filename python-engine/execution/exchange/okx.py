"""
OKX 交易所接口实现
支持现货、合约和期权交易
"""
from __future__ import annotations
import base64
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


class OKXExchange(ExchangeBase):
    """
    OKX 交易所接口

    支持现货、合约和期权交易。
    """

    # API 端点
    BASE_URL = "https://www.okx.com"
    WS_URL = "wss://ws.okx.com:8443/ws/v5/public"

    # 测试网端点
    TESTNET_URL = "https://www.okx.com"  # OKX 使用相同的 URL

    def __init__(
        self,
        api_key: str = "",
        api_secret: str = "",
        passphrase: str = "",
        simulated: bool = False
    ):
        """
        初始化 OKX 交易所

        Args:
            api_key: API Key
            api_secret: API Secret
            passphrase: API Passphrase
            simulated: 是否使用模拟交易
        """
        super().__init__(api_key, api_secret, passphrase)
        self.simulated = simulated
        self.base_url = self.BASE_URL

        # HTTP 会话
        self._session: Optional[aiohttp.ClientSession] = None

        # WebSocket 连接
        self._ws: Optional[websockets.WebSocketClientProtocol] = None
        self._ws_task: Optional[asyncio.Task] = None
        self._ws_running = False

        # 订阅管理
        self._subscriptions: Dict[str, List[Callable]] = {}

        logger.info(f"OKX exchange initialized (simulated={simulated})")

    @property
    def name(self) -> str:
        return "okx"

    @property
    def supported_order_types(self) -> List[OrderType]:
        return [
            OrderType.MARKET,
            OrderType.LIMIT,
            OrderType.STOP_MARKET,
            OrderType.STOP_LIMIT,
        ]

    # ==================== 连接管理 ====================

    async def connect(self) -> bool:
        """连接交易所"""
        try:
            headers = {
                "OK-ACCESS-KEY": self.api_key,
                "Content-Type": "application/json",
            }
            if self.simulated:
                headers["x-simulated-trading"] = "1"

            self._session = aiohttp.ClientSession(headers=headers)

            result = await self.test_connection()

            if result:
                self.is_connected = True
                logger.info("Connected to OKX")
            else:
                logger.error("Failed to connect to OKX")

            return result

        except Exception as e:
            logger.error(f"Error connecting to OKX: {e}")
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
        logger.info("Disconnected from OKX")

    async def test_connection(self) -> bool:
        """测试连接"""
        try:
            # 尝试获取服务器时间
            async with self._session.get(f"{self.base_url}/api/v5/public/time") as resp:
                if resp.status == 200:
                    data = await resp.json()
                    return data.get("code") == "0"
                return False
        except Exception as e:
            logger.error(f"Connection test failed: {e}")
            return False

    # ==================== 签名方法 ====================

    def _sign(self, timestamp: str, method: str, path: str, body: str = "") -> str:
        """生成签名"""
        message = timestamp + method + path + body
        mac = hmac.new(
            self.api_secret.encode(),
            message.encode(),
            hashlib.sha256
        )
        return base64.b64encode(mac.digest()).decode()

    def _get_headers(self, method: str, path: str, body: str = "") -> Dict[str, str]:
        """获取请求头"""
        timestamp = datetime.utcnow().isoformat()[:-3] + "Z"
        sign = self._sign(timestamp, method, path, body)

        headers = {
            "OK-ACCESS-KEY": self.api_key,
            "OK-ACCESS-SIGN": sign,
            "OK-ACCESS-TIMESTAMP": timestamp,
            "OK-ACCESS-PASSPHRASE": self.passphrase,
            "Content-Type": "application/json",
        }

        if self.simulated:
            headers["x-simulated-trading"] = "1"

        return headers

    # ==================== 账户相关 ====================

    async def get_account(self) -> Account:
        """获取账户信息"""
        path = "/api/v5/account/balance"
        headers = self._get_headers("GET", path)

        async with self._session.get(f"{self.base_url}{path}", headers=headers) as resp:
            data = await resp.json()

        if data.get("code") != "0":
            raise Exception(data.get("msg", "Failed to get account"))

        balances = data.get("data", [])
        if balances:
            balance_data = balances[0]
            details = balance_data.get("details", [])

            total_eq = Decimal(str(balance_data.get("totalEq", 0)))
            utime = balance_data.get("uTime", "")

            return Account(
                balance=total_eq,
                available=total_eq,  # 简化处理
                margin_used=Decimal("0"),
                unrealized_pnl=Decimal("0"),
            )

        return Account()

    async def get_balance(self, asset: str = "USDT") -> Decimal:
        """获取资产余额"""
        path = f"/api/v5/account/balance?ccy={asset}"
        headers = self._get_headers("GET", path)

        async with self._session.get(f"{self.base_url}{path}", headers=headers) as resp:
            data = await resp.json()

        if data.get("code") != "0":
            return Decimal("0")

        balances = data.get("data", [])
        if balances:
            details = balances[0].get("details", [])
            for detail in details:
                if detail.get("ccy") == asset:
                    return Decimal(str(detail.get("cashBal", 0)))

        return Decimal("0")

    async def get_positions(self) -> List[Position]:
        """获取所有持仓"""
        path = "/api/v5/account/positions"
        headers = self._get_headers("GET", path)

        async with self._session.get(f"{self.base_url}{path}", headers=headers) as resp:
            data = await resp.json()

        if data.get("code") != "0":
            return []

        positions = []
        for item in data.get("data", []):
            pos_qty = Decimal(str(item.get("pos", 0)))
            if pos_qty != 0:
                positions.append(Position(
                    symbol=item.get("instId", ""),
                    quantity=abs(pos_qty),
                    entry_price=Decimal(str(item.get("avgPx", 0))),
                    mark_price=Decimal(str(item.get("markPx", 0))),
                    unrealized_pnl=Decimal(str(item.get("upl", 0))),
                    leverage=int(item.get("lever", 1)),
                    liquidation_price=Decimal(str(item.get("liqPx", 0))) if item.get("liqPx") else None,
                ))

        return positions

    async def get_position(self, symbol: str) -> Optional[Position]:
        """获取指定持仓"""
        path = f"/api/v5/account/positions?instId={symbol}"
        headers = self._get_headers("GET", path)

        async with self._session.get(f"{self.base_url}{path}", headers=headers) as resp:
            data = await resp.json()

        if data.get("code") != "0" or not data.get("data"):
            return None

        item = data["data"][0]
        pos_qty = Decimal(str(item.get("pos", 0)))

        if pos_qty == 0:
            return None

        return Position(
            symbol=item.get("instId", ""),
            quantity=abs(pos_qty),
            entry_price=Decimal(str(item.get("avgPx", 0))),
            mark_price=Decimal(str(item.get("markPx", 0))),
            unrealized_pnl=Decimal(str(item.get("upl", 0))),
            leverage=int(item.get("lever", 1)),
        )

    # ==================== 订单相关 ====================

    async def place_order(self, order: Order) -> Order:
        """下单"""
        path = "/api/v5/trade/order"

        # OKX 订单参数
        body_data = {
            "instId": order.symbol,
            "tdMode": "cross",  # 全仓模式
            "side": "buy" if order.side == OrderSide.BUY else "sell",
            "ordType": self._convert_order_type(order.order_type),
            "sz": str(order.quantity),
        }

        if order.order_type == OrderType.LIMIT:
            body_data["px"] = str(order.price)

        if order.stop_price:
            body_data["triggerPx"] = str(order.stop_price)

        body = json.dumps(body_data)
        headers = self._get_headers("POST", path, body)

        async with self._session.post(
            f"{self.base_url}{path}",
            headers=headers,
            data=body
        ) as resp:
            data = await resp.json()

        if data.get("code") != "0":
            order.status = OrderStatus.REJECTED
            order.metadata["error"] = data.get("msg", "Unknown error")
            return order

        order_data = data.get("data", [])
        if order_data:
            order.exchange_order_id = order_data[0].get("ordId", "")
            order.client_order_id = order_data[0].get("clOrdId", "")
            order.status = OrderStatus.OPEN

        return order

    def _convert_order_type(self, order_type: OrderType) -> str:
        """转换订单类型"""
        type_map = {
            OrderType.MARKET: "market",
            OrderType.LIMIT: "limit",
            OrderType.STOP_MARKET: "trigger",
            OrderType.STOP_LIMIT: "trigger",
        }
        return type_map.get(order_type, "limit")

    async def cancel_order(self, symbol: str, order_id: str) -> bool:
        """撤销订单"""
        path = "/api/v5/trade/cancel-order"

        body_data = {
            "instId": symbol,
            "ordId": order_id,
        }

        body = json.dumps(body_data)
        headers = self._get_headers("POST", path, body)

        async with self._session.post(
            f"{self.base_url}{path}",
            headers=headers,
            data=body
        ) as resp:
            data = await resp.json()

        return data.get("code") == "0"

    async def cancel_all_orders(self, symbol: Optional[str] = None) -> int:
        """撤销所有订单"""
        if not symbol:
            return 0

        path = "/api/v5/trade/cancel-all-orders"

        body_data = {"instId": symbol}
        body = json.dumps(body_data)
        headers = self._get_headers("POST", path, body)

        async with self._session.post(
            f"{self.base_url}{path}",
            headers=headers,
            data=body
        ) as resp:
            data = await resp.json()

        return len(data.get("data", []))

    async def get_order(self, symbol: str, order_id: str) -> Optional[Order]:
        """查询订单"""
        path = f"/api/v5/trade/order?instId={symbol}&ordId={order_id}"
        headers = self._get_headers("GET", path)

        async with self._session.get(f"{self.base_url}{path}", headers=headers) as resp:
            data = await resp.json()

        if data.get("code") != "0" or not data.get("data"):
            return None

        return self._parse_order(data["data"][0])

    async def get_open_orders(self, symbol: Optional[str] = None) -> List[Order]:
        """获取未成交订单"""
        path = f"/api/v5/trade/orders-pending?instId={symbol}" if symbol else "/api/v5/trade/orders-pending"
        headers = self._get_headers("GET", path)

        async with self._session.get(f"{self.base_url}{path}", headers=headers) as resp:
            data = await resp.json()

        if data.get("code") != "0":
            return []

        return [self._parse_order(item) for item in data.get("data", [])]

    async def get_order_history(
        self,
        symbol: Optional[str] = None,
        start_time: Optional[datetime] = None,
        end_time: Optional[datetime] = None,
        limit: int = 100
    ) -> List[Order]:
        """获取历史订单"""
        params = [f"limit={limit}"]
        if symbol:
            params.append(f"instId={symbol}")
        if start_time:
            params.append(f"before={int(start_time.timestamp() * 1000)}")
        if end_time:
            params.append(f"after={int(end_time.timestamp() * 1000)}")

        path = f"/api/v5/trade/orders-history?{'&'.join(params)}"
        headers = self._get_headers("GET", path)

        async with self._session.get(f"{self.base_url}{path}", headers=headers) as resp:
            data = await resp.json()

        if data.get("code") != "0":
            return []

        return [self._parse_order(item) for item in data.get("data", [])]

    def _parse_order(self, data: Dict) -> Order:
        """解析订单数据"""
        status_map = {
            "live": OrderStatus.OPEN,
            "partially_filled": OrderStatus.PARTIALLY_FILLED,
            "filled": OrderStatus.FILLED,
            "canceled": OrderStatus.CANCELLED,
        }

        side = OrderSide.BUY if data.get("side") == "buy" else OrderSide.SELL

        return Order(
            id=data.get("clOrdId", ""),
            symbol=data.get("instId", ""),
            side=side,
            order_type=OrderType(data.get("ordType", "limit")),
            quantity=Decimal(str(data.get("sz", 0))),
            price=Decimal(str(data.get("px", 0))) if data.get("px") else None,
            status=status_map.get(data.get("state"), OrderStatus.PENDING),
            filled_quantity=Decimal(str(data.get("fillSz", 0))),
            filled_price=Decimal(str(data.get("fillPx", 0))) if data.get("fillPx") else Decimal("0"),
            commission=Decimal(str(data.get("fee", 0))),
            exchange_order_id=data.get("ordId", ""),
            client_order_id=data.get("clOrdId", ""),
            created_at=datetime.fromtimestamp(int(data.get("cTime", 0)) / 1000),
            updated_at=datetime.fromtimestamp(int(data.get("uTime", 0)) / 1000),
        )

    # ==================== 行情相关 ====================

    async def get_ticker(self, symbol: str) -> Ticker:
        """获取行情"""
        url = f"{self.base_url}/api/v5/market/ticker?instId={symbol}"

        async with self._session.get(url) as resp:
            data = await resp.json()

        if data.get("code") != "0" or not data.get("data"):
            raise Exception("Failed to get ticker")

        ticker_data = data["data"][0]

        return Ticker(
            symbol=symbol,
            last_price=Decimal(str(ticker_data.get("last", 0))),
            bid_price=Decimal(str(ticker_data.get("bidPx", 0))),
            bid_quantity=Decimal(str(ticker_data.get("bidSz", 0))),
            ask_price=Decimal(str(ticker_data.get("askPx", 0))),
            ask_quantity=Decimal(str(ticker_data.get("askSz", 0))),
            high_24h=Decimal(str(ticker_data.get("high24h", 0))),
            low_24h=Decimal(str(ticker_data.get("low24h", 0))),
            volume_24h=Decimal(str(ticker_data.get("vol24h", 0))),
            quote_volume_24h=Decimal(str(ticker_data.get("volCcy24h", 0))),
            price_change_24h=Decimal(str(ticker_data.get("open24h", 0))) - Decimal(str(ticker_data.get("last", 0))),
            price_change_percent_24h=Decimal("0"),
        )

    async def get_klines(
        self,
        symbol: str,
        interval: str,
        start_time: Optional[datetime] = None,
        end_time: Optional[datetime] = None,
        limit: int = 300
    ) -> List[Kline]:
        """获取K线数据"""
        # OKX 间隔转换
        interval_map = {
            "1m": "1m",
            "5m": "5m",
            "15m": "15m",
            "1h": "1H",
            "4h": "4H",
            "1d": "1D",
            "1w": "1W",
        }

        bar = interval_map.get(interval, "1H")

        url = f"{self.base_url}/api/v5/market/candles?instId={symbol}&bar={bar}&limit={limit}"

        async with self._session.get(url) as resp:
            data = await resp.json()

        if data.get("code") != "0":
            return []

        klines = []
        for item in data.get("data", []):
            klines.append(Kline(
                symbol=symbol,
                interval=interval,
                open_time=datetime.fromtimestamp(int(item[0]) / 1000),
                open=Decimal(str(item[1])),
                high=Decimal(str(item[2])),
                low=Decimal(str(item[3])),
                close=Decimal(str(item[4])),
                volume=Decimal(str(item[5])),
                close_time=datetime.fromtimestamp(int(item[0]) / 1000 + 3600),
                quote_volume=Decimal(str(item[6])) if len(item) > 6 else Decimal("0"),
            ))

        return klines

    async def get_orderbook(self, symbol: str, limit: int = 20) -> Dict[str, Any]:
        """获取订单簿"""
        url = f"{self.base_url}/api/v5/market/books?instId={symbol}&sz={limit}"

        async with self._session.get(url) as resp:
            data = await resp.json()

        if data.get("code") != "0" or not data.get("data"):
            return {"bids": [], "asks": []}

        book_data = data["data"][0]

        return {
            "bids": [(Decimal(str(b[0])), Decimal(str(b[1]))) for b in book_data.get("bids", [])],
            "asks": [(Decimal(str(a[0])), Decimal(str(a[1]))) for a in book_data.get("asks", [])],
        }

    # ==================== WebSocket 订阅 ====================

    async def _ws_loop(self) -> None:
        """WebSocket 主循环"""
        while self._ws_running:
            try:
                async with websockets.connect(self.ws_url) as ws:
                    self._ws = ws
                    logger.info("OKX WebSocket connected")

                    # 发送订阅请求
                    for channel, callbacks in self._subscriptions.items():
                        subscribe_msg = {
                            "op": "subscribe",
                            "args": [{"channel": channel.split(":")[0], "instId": channel.split(":")[1]}]
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
                    await asyncio.sleep(5)

    async def _handle_ws_message(self, data: Dict) -> None:
        """处理 WebSocket 消息"""
        if "arg" in data and "data" in data:
            channel = data["arg"].get("channel", "")
            inst_id = data["arg"].get("instId", "")

            for item in data.get("data", []):
                if channel == "tickers":
                    ticker = Ticker(
                        symbol=inst_id,
                        last_price=Decimal(str(item.get("last", 0))),
                        bid_price=Decimal(str(item.get("bidPx", 0))),
                        bid_quantity=Decimal(str(item.get("bidSz", 0))),
                        ask_price=Decimal(str(item.get("askPx", 0))),
                        ask_quantity=Decimal(str(item.get("askSz", 0))),
                        high_24h=Decimal(str(item.get("high24h", 0))),
                        low_24h=Decimal(str(item.get("low24h", 0))),
                        volume_24h=Decimal(str(item.get("vol24h", 0))),
                        quote_volume_24h=Decimal(str(item.get("volCcy24h", 0))),
                        price_change_24h=Decimal("0"),
                        price_change_percent_24h=Decimal("0"),
                    )

                    full_channel = f"tickers:{inst_id}"
                    if full_channel in self._subscriptions:
                        for callback in self._subscriptions[full_channel]:
                            await callback(ticker)

    async def subscribe_ticker(self, symbol: str, callback: Callable[[Ticker], Awaitable[None]]) -> None:
        """订阅行情"""
        channel = f"tickers:{symbol}"

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
        channel = f"candle{interval}:{symbol}"

        if channel not in self._subscriptions:
            self._subscriptions[channel] = []
        self._subscriptions[channel].append(callback)

        if not self._ws_task:
            self._ws_running = True
            self._ws_task = asyncio.create_task(self._ws_loop())

    async def subscribe_order(self, callback: Callable[[Order], Awaitable[None]]) -> None:
        """订阅订单更新"""
        # OKX 需要使用私有频道
        pass

    async def unsubscribe(self, channel: str, symbol: Optional[str] = None) -> None:
        """取消订阅"""
        full_channel = f"{channel}:{symbol}" if symbol else channel

        if full_channel in self._subscriptions:
            del self._subscriptions[full_channel]

        if self._ws:
            parts = full_channel.split(":")
            if len(parts) == 2:
                unsubscribe_msg = {
                    "op": "unsubscribe",
                    "args": [{"channel": parts[0], "instId": parts[1]}]
                }
                await self._ws.send(json.dumps(unsubscribe_msg))
