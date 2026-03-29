"""
技术指标计算模块
提供常用技术指标的计算函数
"""
from __future__ import annotations
from typing import List, Optional, Tuple, Union
from decimal import Decimal
import numpy as np
import pandas as pd
from dataclasses import dataclass
from loguru import logger


@dataclass
class IndicatorResult:
    """指标结果"""
    name: str
    values: np.ndarray
    metadata: dict = None

    def latest(self) -> float:
        """获取最新值"""
        return float(self.values[-1]) if len(self.values) > 0 else 0.0

    def to_list(self) -> List[float]:
        """转换为列表"""
        return self.values.tolist()


class TechnicalIndicators:
    """技术指标计算类"""

    @staticmethod
    def SMA(data: Union[List[float], np.ndarray, pd.Series], period: int) -> IndicatorResult:
        """
        简单移动平均线 (Simple Moving Average)

        Args:
            data: 价格数据
            period: 周期

        Returns:
            SMA 值数组
        """
        data = np.array(data, dtype=float)
        result = np.full_like(data, np.nan)
        if len(data) >= period:
            result[period - 1:] = np.convolve(data, np.ones(period), 'valid') / period

        return IndicatorResult(name=f"SMA_{period}", values=result)

    @staticmethod
    def EMA(data: Union[List[float], np.ndarray, pd.Series], period: int) -> IndicatorResult:
        """
        指数移动平均线 (Exponential Moving Average)

        Args:
            data: 价格数据
            period: 周期

        Returns:
            EMA 值数组
        """
        data = np.array(data, dtype=float)
        alpha = 2 / (period + 1)
        result = np.zeros_like(data)
        result[0] = data[0]

        for i in range(1, len(data)):
            result[i] = alpha * data[i] + (1 - alpha) * result[i - 1]

        return IndicatorResult(name=f"EMA_{period}", values=result)

    @staticmethod
    def RSI(data: Union[List[float], np.ndarray, pd.Series], period: int = 14) -> IndicatorResult:
        """
        相对强弱指数 (Relative Strength Index)

        Args:
            data: 价格数据
            period: 周期 (默认14)

        Returns:
            RSI 值数组 (0-100)
        """
        data = np.array(data, dtype=float)
        deltas = np.diff(data)

        gains = np.where(deltas > 0, deltas, 0)
        losses = np.where(deltas < 0, -deltas, 0)

        avg_gains = np.zeros(len(data))
        avg_losses = np.zeros(len(data))

        # 第一个平均值
        if len(gains) >= period:
            avg_gains[period] = np.mean(gains[:period])
            avg_losses[period] = np.mean(losses[:period])

            # 后续使用 EMA
            for i in range(period + 1, len(data)):
                avg_gains[i] = (avg_gains[i - 1] * (period - 1) + gains[i - 1]) / period
                avg_losses[i] = (avg_losses[i - 1] * (period - 1) + losses[i - 1]) / period

        # 计算 RSI
        rsi = np.full(len(data), np.nan)
        valid_mask = (avg_losses != 0) & (avg_gains != 0)
        rs = np.where(avg_losses != 0, avg_gains / avg_losses, 100)
        rsi[valid_mask] = 100 - (100 / (1 + rs[valid_mask]))
        rsi[avg_losses == 0] = 100

        return IndicatorResult(name=f"RSI_{period}", values=rsi)

    @staticmethod
    def MACD(
        data: Union[List[float], np.ndarray, pd.Series],
        fast_period: int = 12,
        slow_period: int = 26,
        signal_period: int = 9
    ) -> Tuple[IndicatorResult, IndicatorResult, IndicatorResult]:
        """
        MACD 指标 (Moving Average Convergence Divergence)

        Args:
            data: 价格数据
            fast_period: 快线周期 (默认12)
            slow_period: 慢线周期 (默认26)
            signal_period: 信号线周期 (默认9)

        Returns:
            (MACD线, 信号线, 柱状图)
        """
        data = np.array(data, dtype=float)

        # 计算 EMA
        ema_fast = TechnicalIndicators.EMA(data, fast_period).values
        ema_slow = TechnicalIndicators.EMA(data, slow_period).values

        # MACD 线
        macd_line = ema_fast - ema_slow

        # 信号线
        signal_line = TechnicalIndicators.EMA(macd_line, signal_period).values

        # 柱状图
        histogram = macd_line - signal_line

        return (
            IndicatorResult(name="MACD", values=macd_line),
            IndicatorResult(name="MACD_Signal", values=signal_line),
            IndicatorResult(name="MACD_Histogram", values=histogram)
        )

    @staticmethod
    def BollingerBands(
        data: Union[List[float], np.ndarray, pd.Series],
        period: int = 20,
        std_dev: float = 2.0
    ) -> Tuple[IndicatorResult, IndicatorResult, IndicatorResult]:
        """
        布林带 (Bollinger Bands)

        Args:
            data: 价格数据
            period: 周期 (默认20)
            std_dev: 标准差倍数 (默认2)

        Returns:
            (上轨, 中轨, 下轨)
        """
        data = np.array(data, dtype=float)

        # 中轨 (SMA)
        middle = TechnicalIndicators.SMA(data, period).values

        # 标准差
        std = np.full_like(data, np.nan)
        for i in range(period - 1, len(data)):
            std[i] = np.std(data[i - period + 1:i + 1])

        # 上下轨
        upper = middle + std_dev * std
        lower = middle - std_dev * std

        return (
            IndicatorResult(name="BB_Upper", values=upper),
            IndicatorResult(name="BB_Middle", values=middle),
            IndicatorResult(name="BB_Lower", values=lower)
        )

    @staticmethod
    def ATR(
        high: Union[List[float], np.ndarray],
        low: Union[List[float], np.ndarray],
        close: Union[List[float], np.ndarray],
        period: int = 14
    ) -> IndicatorResult:
        """
        平均真实波幅 (Average True Range)

        Args:
            high: 最高价
            low: 最低价
            close: 收盘价
            period: 周期 (默认14)

        Returns:
            ATR 值数组
        """
        high = np.array(high, dtype=float)
        low = np.array(low, dtype=float)
        close = np.array(close, dtype=float)

        # 计算真实波幅
        tr = np.zeros(len(close))
        tr[0] = high[0] - low[0]

        for i in range(1, len(close)):
            tr[i] = max(
                high[i] - low[i],
                abs(high[i] - close[i - 1]),
                abs(low[i] - close[i - 1])
            )

        # 计算 ATR
        atr = np.full_like(tr, np.nan)
        if len(tr) >= period:
            atr[period - 1] = np.mean(tr[:period])
            for i in range(period, len(tr)):
                atr[i] = (atr[i - 1] * (period - 1) + tr[i]) / period

        return IndicatorResult(name=f"ATR_{period}", values=atr)

    @staticmethod
    def Stochastic(
        high: Union[List[float], np.ndarray],
        low: Union[List[float], np.ndarray],
        close: Union[List[float], np.ndarray],
        k_period: int = 14,
        d_period: int = 3
    ) -> Tuple[IndicatorResult, IndicatorResult]:
        """
        随机指标 (Stochastic Oscillator)

        Args:
            high: 最高价
            low: 最低价
            close: 收盘价
            k_period: %K 周期 (默认14)
            d_period: %D 周期 (默认3)

        Returns:
            (%K, %D)
        """
        high = np.array(high, dtype=float)
        low = np.array(low, dtype=float)
        close = np.array(close, dtype=float)

        # 计算 %K
        k = np.full_like(close, np.nan)
        for i in range(k_period - 1, len(close)):
            high_max = np.max(high[i - k_period + 1:i + 1])
            low_min = np.min(low[i - k_period + 1:i + 1])
            if high_max != low_min:
                k[i] = 100 * (close[i] - low_min) / (high_max - low_min)
            else:
                k[i] = 50

        # 计算 %D (K 的 SMA)
        d = TechnicalIndicators.SMA(k, d_period).values

        return (
            IndicatorResult(name=f"Stoch_K_{k_period}", values=k),
            IndicatorResult(name=f"Stoch_D_{d_period}", values=d)
        )

    @staticmethod
    def ADX(
        high: Union[List[float], np.ndarray],
        low: Union[List[float], np.ndarray],
        close: Union[List[float], np.ndarray],
        period: int = 14
    ) -> Tuple[IndicatorResult, IndicatorResult, IndicatorResult]:
        """
        平均趋向指数 (Average Directional Index)

        Args:
            high: 最高价
            low: 最低价
            close: 收盘价
            period: 周期 (默认14)

        Returns:
            (ADX, +DI, -DI)
        """
        high = np.array(high, dtype=float)
        low = np.array(low, dtype=float)
        close = np.array(close, dtype=float)

        # 计算 +DM 和 -DM
        plus_dm = np.zeros(len(close))
        minus_dm = np.zeros(len(close))

        for i in range(1, len(close)):
            up_move = high[i] - high[i - 1]
            down_move = low[i - 1] - low[i]

            if up_move > down_move and up_move > 0:
                plus_dm[i] = up_move
            else:
                plus_dm[i] = 0

            if down_move > up_move and down_move > 0:
                minus_dm[i] = down_move
            else:
                minus_dm[i] = 0

        # 计算 ATR
        atr = TechnicalIndicators.ATR(high, low, close, period).values

        # 计算 +DI 和 -DI
        plus_di = np.full_like(close, np.nan)
        minus_di = np.full_like(close, np.nan)

        smooth_plus_dm = TechnicalIndicators.EMA(plus_dm, period).values
        smooth_minus_dm = TechnicalIndicators.EMA(minus_dm, period).values

        for i in range(len(close)):
            if atr[i] != 0 and not np.isnan(atr[i]):
                plus_di[i] = 100 * smooth_plus_dm[i] / atr[i]
                minus_di[i] = 100 * smooth_minus_dm[i] / atr[i]

        # 计算 DX 和 ADX
        dx = np.full_like(close, np.nan)
        for i in range(len(close)):
            if plus_di[i] + minus_di[i] != 0:
                dx[i] = 100 * abs(plus_di[i] - minus_di[i]) / (plus_di[i] + minus_di[i])

        adx = TechnicalIndicators.EMA(dx, period).values

        return (
            IndicatorResult(name=f"ADX_{period}", values=adx),
            IndicatorResult(name=f"+DI_{period}", values=plus_di),
            IndicatorResult(name=f"-DI_{period}", values=minus_di)
        )

    @staticmethod
    def VWAP(
        high: Union[List[float], np.ndarray],
        low: Union[List[float], np.ndarray],
        close: Union[List[float], np.ndarray],
        volume: Union[List[float], np.ndarray]
    ) -> IndicatorResult:
        """
        成交量加权平均价格 (Volume Weighted Average Price)

        Args:
            high: 最高价
            low: 最低价
            close: 收盘价
            volume: 成交量

        Returns:
            VWAP 值数组
        """
        high = np.array(high, dtype=float)
        low = np.array(low, dtype=float)
        close = np.array(close, dtype=float)
        volume = np.array(volume, dtype=float)

        # 典型价格
        typical_price = (high + low + close) / 3

        # 累计值
        cum_tp_vol = np.cumsum(typical_price * volume)
        cum_vol = np.cumsum(volume)

        vwap = np.where(cum_vol != 0, cum_tp_vol / cum_vol, typical_price)

        return IndicatorResult(name="VWAP", values=vwap)

    @staticmethod
    def Ichimoku(
        high: Union[List[float], np.ndarray],
        low: Union[List[float], np.ndarray],
        close: Union[List[float], np.ndarray],
        tenkan_period: int = 9,
        kijun_period: int = 26,
        senkou_b_period: int = 52
    ) -> Tuple[IndicatorResult, IndicatorResult, IndicatorResult, IndicatorResult, IndicatorResult]:
        """
        一目均衡表 (Ichimoku Cloud)

        Args:
            high: 最高价
            low: 最低价
            close: 收盘价
            tenkan_period: 转换线周期 (默认9)
            kijun_period: 基准线周期 (默认26)
            senkou_b_period: 先行带B周期 (默认52)

        Returns:
            (转换线, 基准线, 先行带A, 先行带B, 迟行线)
        """
        high = np.array(high, dtype=float)
        low = np.array(low, dtype=float)
        close = np.array(close, dtype=float)

        def donchian(data_high, data_low, period):
            result = np.full_like(data_high, np.nan)
            for i in range(period - 1, len(data_high)):
                result[i] = (np.max(data_high[i - period + 1:i + 1]) +
                            np.min(data_low[i - period + 1:i + 1])) / 2
            return result

        # 转换线 (Tenkan-sen)
        tenkan = donchian(high, low, tenkan_period)

        # 基准线 (Kijun-sen)
        kijun = donchian(high, low, kijun_period)

        # 先行带A (Senkou Span A)
        senkou_a = (tenkan + kijun) / 2

        # 先行带B (Senkou Span B)
        senkou_b = donchian(high, low, senkou_b_period)

        # 迟行线 (Chikou Span)
        chikou = np.full_like(close, np.nan)
        chikou[:-kijun_period] = close[kijun_period:]

        return (
            IndicatorResult(name="Ichimoku_Tenkan", values=tenkan),
            IndicatorResult(name="Ichimoku_Kijun", values=kijun),
            IndicatorResult(name="Ichimoku_SenkouA", values=senkou_a),
            IndicatorResult(name="Ichimoku_SenkouB", values=senkou_b),
            IndicatorResult(name="Ichimoku_Chikou", values=chikou)
        )

    @staticmethod
    def Supertrend(
        high: Union[List[float], np.ndarray],
        low: Union[List[float], np.ndarray],
        close: Union[List[float], np.ndarray],
        period: int = 10,
        multiplier: float = 3.0
    ) -> Tuple[IndicatorResult, np.ndarray]:
        """
        Supertrend 指标

        Args:
            high: 最高价
            low: 最低价
            close: 收盘价
            period: ATR 周期 (默认10)
            multiplier: 乘数 (默认3.0)

        Returns:
            (Supertrend值, 趋势方向: 1=上涨, -1=下跌)
        """
        high = np.array(high, dtype=float)
        low = np.array(low, dtype=float)
        close = np.array(close, dtype=float)

        # 计算 ATR
        atr = TechnicalIndicators.ATR(high, low, close, period).values

        # 基础上下轨
        hl2 = (high + low) / 2
        upper_band = hl2 + multiplier * atr
        lower_band = hl2 - multiplier * atr

        # Supertrend 计算
        supertrend = np.zeros(len(close))
        trend = np.zeros(len(close))

        supertrend[0] = upper_band[0]
        trend[0] = 1

        for i in range(1, len(close)):
            if np.isnan(atr[i]):
                supertrend[i] = np.nan
                trend[i] = 0
                continue

            # 调整上下轨
            if lower_band[i] > lower_band[i - 1] or close[i - 1] < lower_band[i - 1]:
                lower_band[i] = lower_band[i]
            else:
                lower_band[i] = lower_band[i - 1]

            if upper_band[i] < upper_band[i - 1] or close[i - 1] > upper_band[i - 1]:
                upper_band[i] = upper_band[i]
            else:
                upper_band[i] = upper_band[i - 1]

            # 确定趋势
            if trend[i - 1] == 1:  # 之前是上涨趋势
                if close[i] < lower_band[i]:
                    trend[i] = -1
                    supertrend[i] = upper_band[i]
                else:
                    trend[i] = 1
                    supertrend[i] = lower_band[i]
            else:  # 之前是下跌趋势
                if close[i] > upper_band[i]:
                    trend[i] = 1
                    supertrend[i] = lower_band[i]
                else:
                    trend[i] = -1
                    supertrend[i] = upper_band[i]

        return (
            IndicatorResult(name="Supertrend", values=supertrend),
            trend
        )

    @staticmethod
    def FibonacciRetracement(
        high: float,
        low: float,
        levels: List[float] = None
    ) -> Dict[str, float]:
        """
        斐波那契回撤

        Args:
            high: 最高价
            low: 最低价
            levels: 回撤水平 (默认 [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1])

        Returns:
            各回撤水平的价位
        """
        if levels is None:
            levels = [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1]

        diff = high - low
        result = {}

        for level in levels:
            price = high - diff * level
            result[f"fib_{level:.3f}"] = price

        return result

    @staticmethod
    def PivotPoints(
        high: float,
        low: float,
        close: float,
        method: str = "standard"
    ) -> Dict[str, float]:
        """
        枢轴点

        Args:
            high: 最高价
            low: 最低价
            close: 收盘价
            method: 计算方法 ("standard", "fibonacci", "camarilla")

        Returns:
            枢轴点及支撑阻力位
        """
        if method == "standard":
            pivot = (high + low + close) / 3
            r1 = 2 * pivot - low
            r2 = pivot + (high - low)
            r3 = high + 2 * (high - low)
            s1 = 2 * pivot - high
            s2 = pivot - (high - low)
            s3 = low - 2 * (high - low)

        elif method == "fibonacci":
            pivot = (high + low + close) / 3
            r1 = pivot + 0.382 * (high - low)
            r2 = pivot + 0.618 * (high - low)
            r3 = pivot + 1.0 * (high - low)
            s1 = pivot - 0.382 * (high - low)
            s2 = pivot - 0.618 * (high - low)
            s3 = pivot - 1.0 * (high - low)

        elif method == "camarilla":
            pivot = (high + low + close) / 3
            r1 = close + (high - low) * 1.0833
            r2 = close + (high - low) * 1.1666
            r3 = close + (high - low) * 1.2500
            r4 = close + (high - low) * 1.5000
            s1 = close - (high - low) * 1.0833
            s2 = close - (high - low) * 1.1666
            s3 = close - (high - low) * 1.2500
            s4 = close - (high - low) * 1.5000

        else:
            pivot = (high + low + close) / 3
            r1 = r2 = r3 = pivot
            s1 = s2 = s3 = pivot

        return {
            "pivot": pivot,
            "r1": r1, "r2": r2, "r3": r3,
            "s1": s1, "s2": s2, "s3": s3,
        }
