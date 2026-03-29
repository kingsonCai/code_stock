"""
示例策略 - 双均线交叉策略
"""
from strategy.base import StrategyBase, Context
from loguru import logger


class MACrossStrategy(StrategyBase):
    """
    双均线交叉策略

    当快速均线上穿慢速均线时买入，下穿时卖出。
    """

    def __init__(self, strategy_id: str = "ma_cross"):
        super().__init__(strategy_id)
        self.fast_period = 10
        self.slow_period = 20
        self.position_size = 100

    def initialize(self, context: Context) -> None:
        """初始化策略"""
        # 设置策略参数
        context.config["fast_period"] = self.fast_period
        context.config["slow_period"] = self.slow_period
        context.config["position_size"] = self.position_size

        # 订阅交易标的
        self.subscribe("AAPL")
        self.subscribe("GOOGL")

        # 设置初始资金
        context.portfolio.initial_capital = 100000
        context.portfolio.cash = 100000

        logger.info(f"Strategy {self.strategy_id} initialized")
        logger.info(f"Fast period: {self.fast_period}, Slow period: {self.slow_period}")

    def handle_data(self, context: Context, data: any) -> None:
        """处理数据"""
        for symbol in self.symbols:
            # 获取历史数据
            prices = data.history(symbol, "close", self.slow_period + 1)

            if prices is None or len(prices) < self.slow_period + 1:
                continue

            # 计算移动平均
            fast_ma = prices[-self.fast_period:].mean()
            slow_ma = prices[-self.slow_period:].mean()

            # 前一日的均线
            prev_fast_ma = prices[-(self.fast_period + 1):-1].mean()
            prev_slow_ma = prices[-(self.slow_period + 1):-1].mean()

            # 获取当前持仓
            position = context.portfolio.get_position(symbol)

            # 金叉买入
            if prev_fast_ma <= prev_slow_ma and fast_ma > slow_ma:
                if position.is_flat:
                    context.order(symbol, self.position_size)
                    logger.info(f"Golden cross - Buy {symbol}: {self.position_size}")

            # 死叉卖出
            elif prev_fast_ma >= prev_slow_ma and fast_ma < slow_ma:
                if position.is_long:
                    context.order(symbol, -position.quantity)
                    logger.info(f"Death cross - Sell {symbol}: {-position.quantity}")


class RSIStrategy(StrategyBase):
    """
    RSI 策略

    当 RSI 低于 30 时买入，高于 70 时卖出。
    """

    def __init__(self, strategy_id: str = "rsi"):
        super().__init__(strategy_id)
        self.rsi_period = 14
        self.oversold = 30
        self.overbought = 70

    def initialize(self, context: Context) -> None:
        """初始化策略"""
        context.config["rsi_period"] = self.rsi_period
        context.config["oversold"] = self.oversold
        context.config["overbought"] = self.overbought

        self.subscribe("AAPL")

        context.portfolio.initial_capital = 100000
        context.portfolio.cash = 100000

    def handle_data(self, context: Context, data: any) -> None:
        """处理数据"""
        for symbol in self.symbols:
            # 获取历史数据
            prices = data.history(symbol, "close", self.rsi_period + 1)

            if prices is None or len(prices) < self.rsi_period + 1:
                continue

            # 计算 RSI
            rsi = self._calculate_rsi(prices)

            # 获取当前持仓
            position = context.portfolio.get_position(symbol)

            # 超卖买入
            if rsi < self.oversold and position.is_flat:
                context.order(symbol, 100)
                logger.info(f"RSI oversold - Buy {symbol}: RSI={rsi:.2f}")

            # 超买卖出
            elif rsi > self.overbought and position.is_long:
                context.order(symbol, -position.quantity)
                logger.info(f"RSI overbought - Sell {symbol}: RSI={rsi:.2f}")

    def _calculate_rsi(self, prices, period=14):
        """计算 RSI 指标"""
        deltas = [prices[i] - prices[i - 1] for i in range(1, len(prices))]
        gains = [d if d > 0 else 0 for d in deltas]
        losses = [-d if d < 0 else 0 for d in deltas]

        avg_gain = sum(gains[-period:]) / period
        avg_loss = sum(losses[-period:]) / period

        if avg_loss == 0:
            return 100

        rs = avg_gain / avg_loss
        rsi = 100 - (100 / (1 + rs))

        return rsi
