# 风险管理系统

## 概述

风险管理系统提供完整的风控功能，包括仓位控制、止损止盈、资金管理等。

## 架构

```
core/risk.py
├── RiskLevel           # 风险等级
├── RiskAction          # 风控动作
├── RiskEvent           # 风控事件
├── RiskRule            # 风控规则基类
├── RiskManager         # 风险管理器
└── StopLossTakeProfitManager # 止损止盈管理
```

## 内置风控规则

### 1. MaxPositionSizeRule - 单仓位限制

限制单个持仓占总权益的最大比例。

```python
from core.risk import MaxPositionSizeRule

# 限制单个仓位最大占总权益的 20%
rule = MaxPositionSizeRule(max_position_percent=20.0)
```

### 2. MaxTotalExposureRule - 总敞口限制

限制总敞口（所有持仓市值之和）占总权益的最大比例。

```python
from core.risk import MaxTotalExposureRule

# 限制总敞口最大 80%
rule = MaxTotalExposureRule(max_exposure_percent=80.0)
```

### 3. MaxDrawdownRule - 最大回撤限制

当账户回撤达到阈值时触发平仓。

```python
from core.risk import MaxDrawdownRule

# 最大回撤 20%
rule = MaxDrawdownRule(max_drawdown_percent=20.0)
```

### 4. DailyLossLimitRule - 日内亏损限制

限制单日最大亏损。

```python
from core.risk import DailyLossLimitRule

# 日内最大亏损 5%
rule = DailyLossLimitRule(max_daily_loss_percent=5.0)
```

### 5. MaxLeverageRule - 杠杆限制

限制最大杠杆倍数。

```python
from core.risk import MaxLeverageRule

# 最大杠杆 10 倍
rule = MaxLeverageRule(max_leverage=10)
```

### 6. TradingHoursRule - 交易时间限制

限制只在特定时间段内交易。

```python
from core.risk import TradingHoursRule

# 只在 9:00-17:00 交易
rule = TradingHoursRule(allowed_hours=[9, 10, 11, 12, 13, 14, 15, 16, 17])
```

## 使用风险管理器

### 基本用法

```python
from core.risk import (
    RiskManager,
    AccountInfo,
    PositionInfo
)
from decimal import Decimal

# 创建风险管理器（默认包含所有规则）
risk_manager = RiskManager()

# 准备账户信息
account = AccountInfo(
    total_equity=Decimal("100000"),
    cash=Decimal("80000"),
    margin_used=Decimal("20000"),
    unrealized_pnl=Decimal("1000"),
    daily_pnl=Decimal("-500"),
    positions=[
        PositionInfo(
            symbol="BTCUSDT",
            quantity=Decimal("0.5"),
            entry_price=Decimal("40000"),
            current_price=Decimal("42000"),
            unrealized_pnl=Decimal("1000"),
            market_value=Decimal("21000"),
            leverage=2
        )
    ]
)

# 检查订单风控
events = risk_manager.check_order(
    account=account,
    symbol="ETHUSDT",
    quantity=Decimal("5"),
    price=Decimal("3000"),
    leverage=2
)

for event in events:
    print(f"[{event.level.value}] {event.message}")
    if event.action == RiskAction.REJECT:
        print("订单被拒绝!")
```

### 自定义规则

```python
from core.risk import RiskRule, RiskLevel, RiskAction, RiskEvent, AccountInfo

class MaxPositionsRule(RiskRule):
    """最大持仓数量规则"""

    def __init__(self, max_positions: int = 5):
        self.max_positions = max_positions

    @property
    def name(self) -> str:
        return "max_positions"

    def check(self, account: AccountInfo, context: dict) -> RiskEvent | None:
        current_positions = len([p for p in account.positions if p.quantity != 0])
        new_symbol = context.get("symbol")

        # 检查是否会超过最大持仓数
        if new_symbol and current_positions >= self.max_positions:
            return RiskEvent(
                level=RiskLevel.HIGH,
                action=RiskAction.REJECT,
                message=f"持仓数量 {current_positions} 已达上限 {self.max_positions}",
                details={
                    "current_positions": current_positions,
                    "max_positions": self.max_positions,
                }
            )
        return None

# 添加自定义规则
risk_manager.add_rule(MaxPositionsRule(max_positions=3))
```

### 事件处理

```python
def on_risk_event(event: RiskEvent):
    if event.level == RiskLevel.CRITICAL:
        # 发送告警
        send_alert(f"[CRITICAL] {event.message}")

        if event.action == RiskAction.CLOSE_ALL:
            # 执行平仓
            close_all_positions()

    elif event.level == RiskLevel.HIGH:
        logger.warning(f"Risk warning: {event.message}")

# 注册事件处理器
risk_manager.on_event(on_risk_event)
```

## 止损止盈管理

### 设置止损止盈

```python
from core.risk import StopLossTakeProfitManager
from decimal import Decimal

manager = StopLossTakeProfitManager()

# 设置固定止损
manager.set_stop_loss(
    position_id="pos_001",
    stop_price=Decimal("38000")
)

# 设置追踪止损
manager.set_stop_loss(
    position_id="pos_001",
    stop_price=Decimal("40000"),
    trailing=True,
    trail_percent=2.0  # 价格回撤 2% 触发
)

# 设置止盈
manager.set_take_profit(
    position_id="pos_001",
    take_profit_price=Decimal("45000")
)
```

### 检查触发

```python
# 每次行情更新时检查
result = manager.check(
    position_id="pos_001",
    current_price=Decimal("39000"),
    is_long=True
)

if result:
    if result["action"] == "stop_loss":
        execute_stop_loss(position_id="pos_001")
    elif result["action"] == "take_profit":
        execute_take_profit(position_id="pos_001")
```

## 风控等级说明

| 等级 | 说明 | 典型动作 |
|------|------|----------|
| LOW | 低风险 | ALLOW |
| MEDIUM | 中等风险 | WARN |
| HIGH | 高风险 | REDUCE, REJECT |
| CRITICAL | 严重风险 | CLOSE_ALL |

## 风控动作说明

| 动作 | 说明 |
|------|------|
| ALLOW | 允许操作 |
| WARN | 警告但允许 |
| REDUCE | 减少仓位 |
| REJECT | 拒绝操作 |
| CLOSE_ALL | 平掉所有仓位 |

## 定期检查

建议在策略中定期检查账户风控状态：

```python
async def check_risk_periodically():
    while True:
        # 获取最新账户信息
        account = await get_account_info()

        # 检查风控
        events = risk_manager.check_account(account)

        # 处理事件
        for event in events:
            if event.action == RiskAction.CLOSE_ALL:
                await close_all_positions()

        await asyncio.sleep(60)  # 每分钟检查一次
```

## 最佳实践

### 1. 分层风控

```python
# 策略级风控
strategy_risk = RiskManager()
strategy_risk.add_rule(MaxPositionSizeRule(10))  # 单仓 10%

# 账户级风控
account_risk = RiskManager()
account_risk.add_rule(MaxDrawdownRule(15))  # 回撤 15%
account_risk.add_rule(DailyLossLimitRule(3))  # 日损 3%
```

### 2. 风控参数配置化

```yaml
# risk_config.yaml
rules:
  max_position_size: 20
  max_total_exposure: 80
  max_drawdown: 20
  daily_loss_limit: 5
  max_leverage: 10
  trading_hours: [9, 10, 11, 12, 13, 14, 15, 16, 17]
```

### 3. 日志记录

```python
import logging

# 配置日志
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("risk")

def on_risk_event(event: RiskEvent):
    logger.info(f"Risk event: {event.to_dict()}")
    # 保存到数据库
    save_risk_event(event)
```

## 监控面板

可以通过 API 获取风控状态：

```python
# 获取最近风控事件
events = risk_manager.get_events(limit=20)

for event in events:
    print(f"{event.timestamp} [{event.level.value}] {event.message}")
```
