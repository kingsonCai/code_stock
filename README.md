# 量化交易平台

一个类似 TradingView 的网页版量化交易平台，支持使用 Python 编写交易策略。

## 技术栈

### 前端
- **Vue 3** + TypeScript
- **Vite** - 构建工具
- **Pinia** - 状态管理
- **Vue Router** - 路由
- **TailwindCSS** - 样式
- **lightweight-charts** - K线图表 (TradingView 开源版)
- **Monaco Editor** - 代码编辑器

### 后端
- **Koa** + TypeScript
- **MongoDB** / **PostgreSQL** - 数据库 (通过 DAO 适配层切换)
- **Redis** - 缓存
- **JWT** - 认证

### 量化引擎
- **Python 3** - 策略执行
- 子进程 IPC 通信

## 项目结构

```
quant_trading_system/
├── frontend/                    # Vue 3 前端
│   ├── src/
│   │   ├── api/                 # API 调用封装
│   │   ├── components/          # 组件
│   │   ├── views/               # 页面
│   │   ├── stores/              # Pinia 状态管理
│   │   ├── router/              # 路由配置
│   │   └── assets/              # 静态资源
│   ├── package.json
│   └── vite.config.ts
│
├── backend/                     # Koa 后端
│   ├── src/
│   │   ├── routes/              # 路由
│   │   ├── middleware/          # 中间件
│   │   ├── services/            # 业务逻辑
│   │   ├── dao/                 # DAO 适配层
│   │   └── config/              # 配置
│   ├── tests/                   # 测试
│   └── package.json
│
├── python-engine/               # Python 量化引擎
│
└── docker-compose.yml           # Docker 开发环境
```

## 快速开始

### 1. 启动数据库服务

```bash
docker-compose up -d
```

### 2. 启动后端

```bash
cd backend
cp .env.example .env
npm install
npm run dev
```

### 3. 启动前端

```bash
cd frontend
npm install
npm run dev
```

### 4. 访问应用

打开浏览器访问 http://localhost:5173

## API 接口

### 认证
| 方法 | 路径 | 描述 |
|------|------|------|
| POST | /api/auth/register | 用户注册 |
| POST | /api/auth/login | 用户登录 |
| GET | /api/auth/me | 获取当前用户 |
| PUT | /api/auth/password | 修改密码 |
| POST | /api/auth/refresh | 刷新 Token |
| POST | /api/auth/logout | 登出 |

### 策略
| 方法 | 路径 | 描述 |
|------|------|------|
| GET | /api/strategies | 获取策略列表 |
| GET | /api/strategies/public | 获取公开策略 |
| GET | /api/strategies/:id | 获取策略详情 |
| POST | /api/strategies | 创建策略 |
| PUT | /api/strategies/:id | 更新策略 |
| DELETE | /api/strategies/:id | 删除策略 |
| POST | /api/strategies/:id/duplicate | 复制策略 |
| POST | /api/strategies/:id/publish | 发布策略 |

## 测试

### 后端测试

```bash
cd backend
npm test                    # 单元测试
npm run test:integration    # 集成测试
npm run test:coverage       # 覆盖率报告
```

### 前端测试

```bash
cd frontend
npm run test
```

## DAO 适配层

支持 MongoDB 和 PostgreSQL，通过配置切换：

```typescript
// 使用 MongoDB
DAOFactory.setDatabaseType('mongodb');

// 使用 PostgreSQL
DAOFactory.setDatabaseType('postgresql');
```

## 开发状态

### 已完成 ✅
- [x] 项目结构初始化
- [x] Docker 开发环境 (MongoDB + PostgreSQL + Redis)
- [x] DAO 适配层 (MongoDB + PostgreSQL)
- [x] DAO 单元测试
- [x] 用户认证模块 (注册、登录、JWT)
- [x] 策略 CRUD API
- [x] API 集成测试
- [x] Vue 前端项目初始化
- [x] 基础页面 (登录、注册、仪表盘、策略管理)
- [x] WebSocket 实时通信服务
- [x] K线图表组件 (lightweight-charts)
- [x] Python 代码编辑器 (Monaco Editor)
- [x] 回测面板
- [x] 前端测试

### 待完成 🚧
- [ ] 更多交易所支持
- [ ] 策略性能优化
- [ ] Web UI 优化

## Python 量化引擎

### 已完成模块

| 模块 | 说明 | 文档 |
|------|------|------|
| 交易所对接 | Binance、OKX 实盘接口 | [docs/exchange.md](python-engine/docs/exchange.md) |
| 技术指标 | SMA、EMA、RSI、MACD、布林带等 | [docs/indicators.md](python-engine/docs/indicators.md) |
| 实时行情 | WebSocket 实时推送 | [docs/realtime.md](python-engine/docs/realtime.md) |
| 风控系统 | 仓位控制、止损止盈、回撤管理 | [docs/risk.md](python-engine/docs/risk.md) |

### 目录结构

```
python-engine/
├── core/                  # 核心模块
│   ├── event.py           # 事件定义与事件总线
│   └── engine.py          # 主引擎
├── strategy/              # 策略模块
│   └── base.py            # 策略基类
├── data/                  # 数据模块
│   └── data_manager.py    # 数据管理
├── execution/             # 执行模块
│   ├── order.py           # 订单对象
│   └── simulator.py       # 模拟执行
├── backtest/              # 回测模块
│   └── engine.py          # 回测引擎
├── api/                   # API 模块
│   └── bridge.py          # IPC 桥接
├── examples/              # 示例策略
│   └── ma_cross.py        # 双均线策略
├── main.py                # 主入口
└── pyproject.toml         # 项目配置
```

### 运行回测

```python
# 通过 IPC 发送请求
import json

request = {
    "id": "backtest-001",
    "action": "backtest",
    "payload": {
        "symbol": "AAPL",
        "startDate": "2023-01-01",
        "endDate": "2023-12-31",
        "initialCapital": 100000,
        "commission": 0.001
    }
}

# 发送到 Python 引擎 stdin
print(json.dumps(request))
```

### 策略开发

```python
from strategy.base import StrategyBase, Context

class MyStrategy(StrategyBase):
    def initialize(self, context: Context) -> None:
        """初始化策略"""
        self.subscribe("AAPL")
        context.config["fast_period"] = 10
        context.config["slow_period"] = 20

    def handle_data(self, context: Context, data: any) -> None:
        """处理数据"""
        prices = data.history("AAPL", "close", 20)
        fast_ma = prices[-10:].mean()
        slow_ma = prices[-20:].mean()

        position = context.portfolio.get_position("AAPL")

        if fast_ma > slow_ma and position.is_flat:
            context.order("AAPL", 100)
        elif fast_ma < slow_ma and position.is_long:
            context.order("AAPL", -position.quantity)
```

## License

MIT
