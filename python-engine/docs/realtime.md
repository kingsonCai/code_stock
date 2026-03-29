# 实时行情推送模块

## 概述

实时行情推送模块提供多数据源的行情订阅和分发功能，支持 WebSocket 实时推送。

## 架构

```
data/realtime.py
├── MarketTick          # 行情快照
├── KlineBar            # K线数据
├── MarketDataSubscriber # 订阅器接口
├── MockMarketDataSubscriber # 模拟数据源
├── MarketDataService   # 行情数据服务
└── RealtimeQuoteServer # WebSocket 服务器
```

## 组件说明

### 1. MarketTick - 行情快照

```python
@dataclass
class MarketTick:
    symbol: str           # 交易对
    price: Decimal        # 最新价
    bid: Decimal          # 买一价
    ask: Decimal          # 卖一价
    volume: Decimal       # 成交量
    timestamp: datetime   # 时间戳
    source: DataSource    # 数据源
```

### 2. KlineBar - K线数据

```python
@dataclass
class KlineBar:
    symbol: str           # 交易对
    interval: str         # 周期
    open: Decimal         # 开盘价
    high: Decimal         # 最高价
    low: Decimal          # 最低价
    close: Decimal        # 收盘价
    volume: Decimal       # 成交量
    open_time: datetime   # 开盘时间
    close_time: datetime  # 收盘时间
    source: DataSource    # 数据源
```

### 3. MarketDataService - 行情数据服务

统一管理多个数据源，提供行情订阅接口。

```python
from data.realtime import MarketDataService, DataSource

service = MarketDataService()

# 注册数据源
service.register_subscriber(DataSource.MOCK, MockMarketDataSubscriber())
service.register_subscriber(DataSource.BINANCE, BinanceSubscriber())

# 订阅行情
async def on_tick(tick: MarketTick):
    print(f"{tick.symbol}: {tick.price}")

await service.subscribe(
    symbol="BTCUSDT",
    source=DataSource.BINANCE,
    on_tick=on_tick,
    interval="1m"
)

# 获取缓存行情
cached = service.get_cached_tick("BTCUSDT", DataSource.BINANCE)

# 启动/停止
await service.start()
await service.stop()
```

### 4. RealtimeQuoteServer - WebSocket 服务器

提供 WebSocket 接口供前端订阅行情。

```python
from data.realtime import RealtimeQuoteServer

server = RealtimeQuoteServer(port=8765)
await server.start()
```

## WebSocket 协议

### 客户端 -> 服务端

**订阅行情**
```json
{
    "action": "subscribe",
    "symbol": "BTCUSDT",
    "source": "binance"
}
```

**取消订阅**
```json
{
    "action": "unsubscribe",
    "symbol": "BTCUSDT",
    "source": "binance"
}
```

### 服务端 -> 客户端

**订阅确认**
```json
{
    "type": "subscribed",
    "symbol": "BTCUSDT",
    "source": "binance"
}
```

**行情推送**
```json
{
    "type": "tick",
    "data": {
        "symbol": "BTCUSDT",
        "price": 50000.00,
        "bid": 49999.50,
        "ask": 50000.50,
        "volume": 123456.78,
        "timestamp": "2024-01-15T10:30:00Z",
        "source": "binance"
    }
}
```

**K线推送**
```json
{
    "type": "kline",
    "data": {
        "symbol": "BTCUSDT",
        "interval": "1m",
        "open": 50000.00,
        "high": 50100.00,
        "low": 49900.00,
        "close": 50050.00,
        "volume": 123.45,
        "openTime": "2024-01-15T10:30:00Z",
        "closeTime": "2024-01-15T10:31:00Z",
        "source": "binance"
    }
}
```

## 前端接入

### JavaScript/TypeScript

```javascript
const ws = new WebSocket('ws://localhost:8765');

ws.onopen = () => {
    // 订阅行情
    ws.send(JSON.stringify({
        action: 'subscribe',
        symbol: 'BTCUSDT',
        source: 'binance'
    }));
};

ws.onmessage = (event) => {
    const message = JSON.parse(event.data);

    if (message.type === 'tick') {
        const { symbol, price, bid, ask } = message.data;
        console.log(`${symbol}: ${price}`);
        updateChart(price);
    }
};

ws.onclose = () => {
    console.log('Disconnected');
};
```

### Vue 3 示例

```vue
<script setup>
import { ref, onMounted, onUnmounted } from 'vue';

const ws = ref(null);
const tick = ref(null);

onMounted(() => {
    ws.value = new WebSocket('ws://localhost:8765');

    ws.value.onopen = () => {
        ws.value.send(JSON.stringify({
            action: 'subscribe',
            symbol: 'BTCUSDT',
            source: 'mock'
        }));
    };

    ws.value.onmessage = (event) => {
        const msg = JSON.parse(event.data);
        if (msg.type === 'tick') {
            tick.value = msg.data;
        }
    };
});

onUnmounted(() => {
    ws.value?.close();
});
</script>

<template>
    <div v-if="tick">
        <h2>{{ tick.symbol }}</h2>
        <p>Price: {{ tick.price }}</p>
        <p>Bid: {{ tick.bid }}</p>
        <p>Ask: {{ tick.ask }}</p>
    </div>
</template>
```

## 数据源扩展

要添加新的数据源，需要实现 `MarketDataSubscriber` 接口：

```python
from data.realtime import MarketDataSubscriber, MarketTick, KlineBar, DataSource

class BinanceMarketDataSubscriber(MarketDataSubscriber):
    def __init__(self, api_key: str, api_secret: str):
        self.api_key = api_key
        self.api_secret = api_secret
        self._ws = None
        self._callbacks = {}

    async def subscribe_ticker(self, symbol: str, callback) -> None:
        # 连接 Binance WebSocket
        # 注册回调
        pass

    async def subscribe_kline(self, symbol: str, interval: str, callback) -> None:
        pass

    async def unsubscribe(self, channel: str) -> None:
        pass

    async def start(self) -> None:
        # 启动 WebSocket 连接
        pass

    async def stop(self) -> None:
        # 关闭连接
        pass
```

## 性能考虑

1. **连接池**：复用 WebSocket 连接
2. **消息缓冲**：使用队列处理高频消息
3. **心跳检测**：保持连接活跃
4. **重连机制**：自动重连断开的连接

## 监控指标

```python
# 获取服务状态
print(f"Running: {service.is_running}")
print(f"Active subscriptions: {len(service._subscribed_symbols)}")
print(f"Cached ticks: {len(service._cache)}")
```
