# Python 量化引擎

## 概述

Python 量化引擎是一个事件驱动的量化交易框架，支持策略开发、回测和实盘交易。

## 特性

- **事件驱动架构**：解耦的组件通信
- **多交易所支持**：Binance、OKX 等
- **丰富的技术指标**：MA、RSI、MACD、布林带等
- **完整的风控系统**：仓位控制、止损止盈、回撤控制
- **实时行情推送**：WebSocket 支持
- **IPC 桥接**：与 Node.js 后端通信

## 快速开始

### 安装

```bash
cd python-engine
pip install -r requirements.txt
```

### 运行

```bash
python main.py
```

### 发送请求

```python
import json

# 回测请求
request = {
    "id": "req-001",
    "action": "backtest",
    "payload": {
        "symbol": "BTCUSDT",
        "startDate": "2023-01-01",
        "endDate": "2023-12-31",
        "initialCapital": 100000,
        "commission": 0.001
    }
}

print(json.dumps(request))
```

## 目录结构

```
python-engine/
├── core/                  # 核心模块
│   ├── event.py           # 事件系统
│   ├── engine.py          # 主引擎
│   └── risk.py            # 风控系统
├── strategy/              # 策略模块
│   ├── base.py            # 策略基类
│   └── context.py         # 策略上下文
├── data/                  # 数据模块
│   ├── data_manager.py    # 数据管理
│   └── realtime.py        # 实时行情
├── execution/             # 执行模块
│   ├── order.py           # 订单对象
│   ├── simulator.py       # 模拟执行
│   └── exchange/          # 交易所接口
│       ├── base.py        # 基类
│       ├── binance.py     # Binance
│       └── okx.py         # OKX
├── backtest/              # 回测模块
│   └── engine.py          # 回测引擎
├── utils/                 # 工具模块
│   └── indicators.py      # 技术指标
├── api/                   # API 模块
│   └── bridge.py          # IPC 桥接
├── examples/              # 示例策略
│   └── ma_cross.py        # 双均线策略
├── docs/                  # 文档
│   ├── exchange.md        # 交易所对接
│   ├── indicators.md      # 技术指标
│   ├── realtime.md        # 实时行情
│   └── risk.md            # 风控系统
├── main.py                # 入口文件
├── pyproject.toml         # 项目配置
└── requirements.txt       # 依赖
```

## 文档

- [交易所实盘对接](docs/exchange.md)
- [技术指标模块](docs/indicators.md)
- [实时行情推送](docs/realtime.md)
- [风险管理系统](docs/risk.md)

## 编写策略

```python
from strategy.base import StrategyBase, Context

class MyStrategy(StrategyBase):
    def initialize(self, context: Context) -> None:
        """初始化策略"""
        self.subscribe("BTCUSDT")
        context.portfolio.initial_capital = 100000

    def handle_data(self, context: Context, data: any) -> None:
        """处理数据"""
        prices = data.history("BTCUSDT", "close", 20)
        ma = sum(prices[-20:]) / 20

        position = context.portfolio.get_position("BTCUSDT")

        if prices[-1] > ma and position.is_flat:
            context.order("BTCUSDT", 0.1)
        elif prices[-1] < ma and position.is_long:
            context.order("BTCUSDT", -position.quantity)
```

## IPC 协议

### 请求格式

```json
{
    "id": "request-id",
    "action": "backtest",
    "payload": { ... }
}
```

### 支持的 Actions

| Action | 说明 |
|--------|------|
| ping | 心跳检测 |
| backtest | 运行回测 |
| run_strategy | 运行实时策略 |
| get_indicators | 获取指标列表 |
| stop | 停止引擎 |

### 响应格式

```json
{
    "id": "request-id",
    "success": true,
    "data": { ... }
}
```

## 与 Node.js 后端集成

```typescript
// backend/src/services/python-bridge.ts
import { spawn } from 'child_process';

class PythonBridge {
    private process = spawn('python3', ['main.py'], {
        cwd: '../python-engine',
        stdio: ['pipe', 'pipe', 'pipe']
    });

    async send(action: string, payload: any): Promise<any> {
        const request = { id: uuid(), action, payload };
        this.process.stdin.write(JSON.stringify(request) + '\n');
        // ... 处理响应
    }
}
```

## 开发指南

### 运行测试

```bash
pytest tests/
```

### 代码风格

```bash
black .
ruff check .
mypy .
```

## License

MIT
