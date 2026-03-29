# 交易所实盘对接模块

## 概述

交易所对接模块提供统一的接口来连接各大交易所，支持现货和合约交易。

## 支持的交易所

| 交易所 | 现货 | 合约 | WebSocket |
|--------|------|------|-----------|
| Binance | ✅ | ✅ | ✅ |
| OKX | ✅ | ✅ | ✅ |

## 架构设计

```
execution/exchange/
├── base.py          # 交易所基类和通用数据结构
├── binance.py       # Binance 交易所实现
└── okx.py           # OKX 交易所实现
```

## 快速开始

### 初始化交易所

```python
from execution.exchange.binance import BinanceExchange
from execution.exchange.okx import OKXExchange

# Binance 合约
binance = BinanceExchange(
    api_key="your-api-key",
    api_secret="your-api-secret",
    futures=True,
    testnet=True  # 使用测试网
)

# OKX
okx = OKXExchange(
    api_key="your-api-key",
    api_secret="your-api-secret",
    passphrase="your-passphrase",
    simulated=True  # 模拟交易
)

# 连接
await binance.connect()
```

### 下单

```python
from execution.exchange.base import Order, OrderSide, OrderType

# 市价单
order = Order(
    id="order-001",
    symbol="BTCUSDT",
    side=OrderSide.BUY,
    order_type=OrderType.MARKET,
    quantity=Decimal("0.01"),
)

result = await binance.place_order(order)
print(f"Order status: {result.status}")
print(f"Exchange order ID: {result.exchange_order_id}")
```

### 查询订单

```python
# 查询单个订单
order = await binance.get_order("BTCUSDT", "order-id")

# 获取未成交订单
open_orders = await binance.get_open_orders("BTCUSDT")

# 获取历史订单
history = await binance.get_order_history(
    symbol="BTCUSDT",
    limit=100
)
```

### 撤销订单

```python
# 撤销单个订单
await binance.cancel_order("BTCUSDT", "order-id")

# 撤销所有订单
count = await binance.cancel_all_orders("BTCUSDT")
print(f"Cancelled {count} orders")
```

### 获取账户信息

```python
# 获取账户余额
balance = await binance.get_balance("USDT")

# 获取持仓
positions = await binance.get_positions()
for pos in positions:
    print(f"{pos.symbol}: {pos.quantity} @ {pos.entry_price}")
```

### 获取行情

```python
# 获取行情
ticker = await binance.get_ticker("BTCUSDT")
print(f"Last price: {ticker.last_price}")
print(f"24h change: {ticker.price_change_percent_24h}%")

# 获取K线
klines = await binance.get_klines(
    symbol="BTCUSDT",
    interval="1h",
    limit=100
)

# 获取订单簿
orderbook = await binance.get_orderbook("BTCUSDT", limit=20)
```

## WebSocket 订阅

### 订阅行情

```python
async def on_ticker(ticker: Ticker):
    print(f"{ticker.symbol}: {ticker.last_price}")

await binance.subscribe_ticker("BTCUSDT", on_ticker)
```

### 订阅K线

```python
async def on_kline(kline: Kline):
    print(f"{kline.symbol} {kline.interval}: O={kline.open} H={kline.high} L={kline.low} C={kline.close}")

await binance.subscribe_kline("BTCUSDT", "1m", on_kline)
```

### 取消订阅

```python
await binance.unsubscribe("ticker", "BTCUSDT")
```

## 订单类型

| 类型 | 说明 |
|------|------|
| MARKET | 市价单 |
| LIMIT | 限价单 |
| STOP_MARKET | 止损市价单 |
| STOP_LIMIT | 止损限价单 |
| TRAILING_STOP | 追踪止损单 |

## 订单状态

| 状态 | 说明 |
|------|------|
| PENDING | 待提交 |
| OPEN | 已提交待成交 |
| PARTIALLY_FILLED | 部分成交 |
| FILLED | 完全成交 |
| CANCELLED | 已撤销 |
| REJECTED | 被拒绝 |
| EXPIRED | 已过期 |

## 测试网配置

### Binance 测试网

1. 访问 https://testnet.binancefuture.com/
2. 使用 GitHub 账号登录
3. 创建 API Key

### OKX 模拟交易

1. 登录 OKX 账号
2. 进入 API 管理页面
3. 创建 API Key 时勾选"模拟交易"

## 安全建议

1. **API Key 权限**：只授予必要的权限（交易、查询），不要授予提现权限
2. **IP 白名单**：设置 API Key 的 IP 白名单
3. **密钥存储**：使用环境变量或加密存储，不要硬编码
4. **测试网测试**：先在测试网充分测试，再使用真实资金

## 错误处理

```python
try:
    order = await exchange.place_order(order)
except Exception as e:
    logger.error(f"Order failed: {e}")
    # 处理错误
```

## 扩展新交易所

要添加新的交易所支持，需要：

1. 继承 `ExchangeBase` 基类
2. 实现所有抽象方法
3. 处理交易所特定的 API 差异

```python
class NewExchange(ExchangeBase):
    @property
    def name(self) -> str:
        return "new_exchange"

    # 实现所有抽象方法...
```
