# 技术指标模块

## 概述

技术指标模块提供常用技术指标的计算功能，支持 NumPy 和 Pandas 数据格式。

## 目录

```
utils/indicators.py
```

## 支持的指标

| 指标 | 函数 | 说明 |
|------|------|------|
| 简单移动平均 | `SMA` | Simple Moving Average |
| 指数移动平均 | `EMA` | Exponential Moving Average |
| 相对强弱指数 | `RSI` | Relative Strength Index |
| MACD | `MACD` | Moving Average Convergence Divergence |
| 布林带 | `BollingerBands` | Bollinger Bands |
| 平均真实波幅 | `ATR` | Average True Range |
| 随机指标 | `Stochastic` | Stochastic Oscillator |
| 平均趋向指数 | `ADX` | Average Directional Index |
| VWAP | `VWAP` | Volume Weighted Average Price |
| 一目均衡表 | `Ichimoku` | Ichimoku Cloud |
| Supertrend | `Supertrend` | Supertrend Indicator |
| 斐波那契回撤 | `FibonacciRetracement` | Fibonacci Retracement |
| 枢轴点 | `PivotPoints` | Pivot Points |

## 使用示例

### 移动平均线

```python
from utils.indicators import TechnicalIndicators as TI

# 简单移动平均
sma = TI.SMA(close_prices, period=20)
print(f"最新 SMA20: {sma.latest()}")

# 指数移动平均
ema = TI.EMA(close_prices, period=20)
print(f"最新 EMA20: {ema.latest()}")
```

### RSI

```python
# 计算 14 周期 RSI
rsi = TI.RSI(close_prices, period=14)
print(f"当前 RSI: {rsi.latest()}")

# 判断超买超卖
if rsi.latest() > 70:
    print("超买")
elif rsi.latest() < 30:
    print("超卖")
```

### MACD

```python
# 计算 MACD
macd_line, signal_line, histogram = TI.MACD(
    close_prices,
    fast_period=12,
    slow_period=26,
    signal_period=9
)

# 判断金叉死叉
if macd_line.latest() > signal_line.latest():
    if macd_line.values[-2] <= signal_line.values[-2]:
        print("金叉 - 买入信号")
elif macd_line.latest() < signal_line.latest():
    if macd_line.values[-2] >= signal_line.values[-2]:
        print("死叉 - 卖出信号")
```

### 布林带

```python
upper, middle, lower = TI.BollingerBands(
    close_prices,
    period=20,
    std_dev=2.0
)

# 计算带宽
bandwidth = (upper.latest() - lower.latest()) / middle.latest() * 100

# 判断价格位置
current_price = close_prices[-1]
if current_price > upper.latest():
    print("价格突破上轨")
elif current_price < lower.latest():
    print("价格跌破下轨")
```

### ATR

```python
atr = TI.ATR(high_prices, low_prices, close_prices, period=14)

# 使用 ATR 计算止损距离
stop_loss_distance = atr.latest() * 2  # 2 倍 ATR 止损
```

### 随机指标

```python
k, d = TI.Stochastic(
    high_prices,
    low_prices,
    close_prices,
    k_period=14,
    d_period=3
)

# 判断超买超卖
if k.latest() > 80 and d.latest() > 80:
    print("超买区域")
elif k.latest() < 20 and d.latest() < 20:
    print("超卖区域")
```

### ADX

```python
adx, plus_di, minus_di = TI.ADX(
    high_prices,
    low_prices,
    close_prices,
    period=14
)

# 判断趋势强度
if adx.latest() > 25:
    print("强趋势")
    if plus_di.latest() > minus_di.latest():
        print("上升趋势")
    else:
        print("下降趋势")
else:
    print("无明确趋势")
```

### VWAP

```python
vwap = TI.VWAP(high_prices, low_prices, close_prices, volumes)

# 价格与 VWAP 比较
if close_prices[-1] > vwap.latest():
    print("价格在 VWAP 上方 - 多头优势")
else:
    print("价格在 VWAP 下方 - 空头优势")
```

### 一目均衡表

```python
tenkan, kijun, senkou_a, senkou_b, chikou = TI.Ichimoku(
    high_prices,
    low_prices,
    close_prices,
    tenkan_period=9,
    kijun_period=26,
    senkou_b_period=52
)

# 判断云图
current_price = close_prices[-1]
if current_price > senkou_a.latest() and current_price > senkou_b.latest():
    print("价格在云图上方 - 多头")
elif current_price < senkou_a.latest() and current_price < senkou_b.latest():
    print("价格在云图下方 - 空头")
```

### Supertrend

```python
supertrend, trend = TI.Supertrend(
    high_prices,
    low_prices,
    close_prices,
    period=10,
    multiplier=3.0
)

# trend: 1 = 上涨趋势, -1 = 下跌趋势
if trend[-1] == 1:
    print("上涨趋势，支撑位:", supertrend.latest())
else:
    print("下跌趋势，阻力位:", supertrend.latest())
```

### 斐波那契回撤

```python
fib_levels = TI.FibonacciRetracement(
    high=high_price,
    low=low_price
)

for level, price in fib_levels.items():
    print(f"{level}: {price}")
```

### 枢轴点

```python
# 标准枢轴点
pivot_points = TI.PivotPoints(high, low, close, method="standard")

# 斐波那契枢轴点
fib_pivot = TI.PivotPoints(high, low, close, method="fibonacci")

# Camarilla 枢轴点
cam_pivot = TI.PivotPoints(high, low, close, method="camarilla")
```

## 在策略中使用

```python
from strategy.base import StrategyBase, Context
from utils.indicators import TechnicalIndicators as TI

class MyStrategy(StrategyBase):
    def initialize(self, context: Context) -> None:
        self.subscribe("BTCUSDT")
        self.fast_period = 10
        self.slow_period = 20

    def handle_data(self, context: Context, data: any) -> None:
        prices = data.history("BTCUSDT", "close", 50)

        # 计算指标
        fast_ma = TI.SMA(prices, self.fast_period)
        slow_ma = TI.SMA(prices, self.slow_period)
        rsi = TI.RSI(prices, 14)

        # 获取最新值
        fast = fast_ma.latest()
        slow = slow_ma.latest()
        rsi_val = rsi.latest()

        # 交易逻辑
        position = context.portfolio.get_position("BTCUSDT")

        if fast > slow and rsi_val < 70:
            if position.is_flat:
                context.order("BTCUSDT", 0.1)
        elif fast < slow or rsi_val > 70:
            if position.is_long:
                context.order("BTCUSDT", -position.quantity)
```

## 返回值

所有指标返回 `IndicatorResult` 对象：

```python
@dataclass
class IndicatorResult:
    name: str           # 指标名称
    values: np.ndarray  # 指标值数组
    metadata: dict      # 元数据

    def latest(self) -> float:    # 获取最新值
    def to_list(self) -> List[float]:  # 转为列表
```

## 性能优化

- 使用 NumPy 向量化计算
- 避免在循环中重复计算
- 对于高频数据，考虑预分配数组

## 扩展指标

可以继承 `TechnicalIndicators` 类添加自定义指标：

```python
class CustomIndicators(TechnicalIndicators):
    @staticmethod
    def MyIndicator(data, period):
        # 自定义计算逻辑
        result = ...
        return IndicatorResult(name="MyIndicator", values=result)
```
