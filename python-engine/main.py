"""
Python 量化引擎主入口

与 Node.js 后端通过 stdin/stdout 进行 IPC 通信。
"""
from __future__ import annotations
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional
import json
import asyncio
import sys
import traceback
from loguru import logger

# 配置日志
logger.remove()
logger.add(sys.stderr, level="INFO")


class PythonEngine:
    """Python 量化引擎"""

    def __init__(self):
        self.strategies: Dict[str, any] = {}
        self.running = False

    async def run(self):
        """运行引擎主循环"""
        self.running = True
        logger.info("Python engine started")

        try:
            while self.running:
                # 从 stdin 读取请求
                line = await self._read_line()
                if not line:
                    continue

                try:
                    request = json.loads(line)
                    response = await self._handle_request(request)

                    # 写入响应到 stdout
                    self._write_response(response)

                except json.JSONDecodeError as e:
                    logger.error(f"Invalid JSON: {e}")
                    self._write_response({
                        "id": None,
                        "success": False,
                        "error": f"Invalid JSON: {str(e)}"
                    })

                except Exception as e:
                    logger.error(f"Error handling request: {e}")
                    logger.error(traceback.format_exc())
                    self._write_response({
                        "id": None,
                        "success": False,
                        "error": str(e)
                    })

        except KeyboardInterrupt:
            logger.info("Engine interrupted")
        finally:
            self.running = False
            logger.info("Python engine stopped")

    async def _read_line(self) -> str:
        """异步读取一行"""
        loop = asyncio.get_event_loop()
        try:
            line = await loop.run_in_executor(None, sys.stdin.readline)
            return line.strip()
        except Exception:
            return ""

    def _write_response(self, response: dict):
        """写入响应"""
        try:
            json_str = json.dumps(response, ensure_ascii=False)
            sys.stdout.write(json_str + "\n")
            sys.stdout.flush()
        except Exception as e:
            logger.error(f"Error writing response: {e}")

    async def _handle_request(self, request: dict) -> dict:
        """处理请求"""
        request_id = request.get("id")
        action = request.get("action")
        payload = request.get("payload", {})

        logger.debug(f"Handling request: {action} (id={request_id})")

        try:
            if action == "ping":
                return {
                    "id": request_id,
                    "success": True,
                    "data": {"pong": True}
                }

            elif action == "backtest":
                result = await self._run_backtest(payload)
                return {
                    "id": request_id,
                    "success": True,
                    "data": result
                }

            elif action == "run_strategy":
                result = await self._run_strategy(payload)
                return {
                    "id": request_id,
                    "success": True,
                    "data": result
                }

            elif action == "get_indicators":
                indicators = self._get_indicators(payload)
                return {
                    "id": request_id,
                    "success": True,
                    "data": indicators
                }

            elif action == "stop":
                self.running = False
                return {
                    "id": request_id,
                    "success": True,
                    "data": {"stopped": True}
                }

            else:
                return {
                    "id": request_id,
                    "success": False,
                    "error": f"Unknown action: {action}"
                }

        except Exception as e:
            logger.error(f"Error in action {action}: {e}")
            logger.error(traceback.format_exc())
            return {
                "id": request_id,
                "success": False,
                "error": str(e)
            }

    async def _run_backtest(self, config: dict) -> dict:
        """运行回测"""
        import numpy as np
        import pandas as pd

        # 获取配置
        symbol = config.get("symbol", "AAPL")
        start_date = config.get("startDate", "2023-01-01")
        end_date = config.get("endDate", "2023-12-31")
        initial_capital = config.get("initialCapital", 100000)
        commission = config.get("commission", 0.001)
        strategy_code = config.get("code", "")

        logger.info(f"Running backtest for {symbol}")
        logger.info(f"Period: {start_date} to {end_date}")
        logger.info(f"Initial capital: {initial_capital}")

        # 模拟生成历史数据
        np.random.seed(42)
        dates = pd.date_range(start=start_date, end=end_date, freq="D")
        n = len(dates)

        # 生成随机价格数据（随机游走）
        returns = np.random.randn(n) * 0.02
        prices = 100 * np.exp(np.cumsum(returns))

        # 生成 OHLCV 数据
        high = prices * (1 + np.abs(np.random.randn(n)) * 0.01)
        low = prices * (1 - np.abs(np.random.randn(n)) * 0.01)
        open_prices = prices + np.random.randn(n) * 0.5
        volumes = np.random.randint(1000000, 10000000, n)

        # 创建 DataFrame
        df = pd.DataFrame({
            "date": dates,
            "open": open_prices,
            "high": high,
            "low": low,
            "close": prices,
            "volume": volumes
        })

        # 简单的双均线策略
        fast_period = 10
        slow_period = 20

        df["fast_ma"] = df["close"].rolling(fast_period).mean()
        df["slow_ma"] = df["close"].rolling(slow_period).mean()

        # 生成交易信号
        df["signal"] = 0
        df.loc[df["fast_ma"] > df["slow_ma"], "signal"] = 1
        df.loc[df["fast_ma"] < df["slow_ma"], "signal"] = -1

        # 计算持仓
        df["position"] = df["signal"].diff()

        # 模拟交易
        cash = initial_capital
        shares = 0
        trades = []
        equity_curve = []

        for i, row in df.iterrows():
            if pd.isna(row["fast_ma"]) or pd.isna(row["slow_ma"]):
                continue

            price = row["close"]

            # 买入
            if row["position"] == 2 and cash > 0:
                shares_to_buy = int(cash / price)
                if shares_to_buy > 0:
                    cost = shares_to_buy * price * (1 + commission)
                    cash -= cost
                    shares += shares_to_buy
                    trades.append({
                        "date": row["date"].strftime("%Y-%m-%d"),
                        "type": "buy",
                        "price": round(price, 2),
                        "shares": shares_to_buy,
                        "value": round(cost, 2)
                    })

            # 卖出
            elif row["position"] == -2 and shares > 0:
                proceeds = shares * price * (1 - commission)
                cash += proceeds
                trades.append({
                    "date": row["date"].strftime("%Y-%m-%d"),
                    "type": "sell",
                    "price": round(price, 2),
                    "shares": shares,
                    "value": round(proceeds, 2)
                })
                shares = 0

            # 记录权益
            equity = cash + shares * price
            equity_curve.append({
                "date": row["date"].strftime("%Y-%m-%d"),
                "equity": round(equity, 2)
            })

        # 计算最终权益
        final_price = df.iloc[-1]["close"]
        final_equity = cash + shares * final_price

        # 计算绩效指标
        total_return = (final_equity - initial_capital) / initial_capital * 100
        annualized_return = total_return * (252 / n)

        # 计算最大回撤
        equity_series = pd.Series([e["equity"] for e in equity_curve])
        rolling_max = equity_series.expanding().max()
        drawdown = (equity_series - rolling_max) / rolling_max
        max_drawdown = drawdown.min() * 100

        # 计算 Sharpe Ratio
        returns_series = equity_series.pct_change().dropna()
        sharpe_ratio = (returns_series.mean() / returns_series.std()) * np.sqrt(252) if returns_series.std() > 0 else 0

        # 计算胜率
        winning_trades = 0
        total_trades = len(trades) // 2  # 买卖成对

        for i in range(0, len(trades) - 1, 2):
            if i + 1 < len(trades):
                buy_trade = trades[i]
                sell_trade = trades[i + 1]
                if sell_trade["price"] > buy_trade["price"]:
                    winning_trades += 1

        win_rate = (winning_trades / total_trades * 100) if total_trades > 0 else 0

        return {
            "metrics": {
                "totalReturn": round(total_return, 2),
                "annualizedReturn": round(annualized_return, 2),
                "maxDrawdown": round(max_drawdown, 2),
                "sharpeRatio": round(sharpe_ratio, 2),
                "winRate": round(win_rate, 2),
                "totalTrades": total_trades,
                "finalEquity": round(final_equity, 2),
                "initialCapital": initial_capital
            },
            "trades": trades[:50],  # 只返回前 50 笔交易
            "equityCurve": equity_curve[::5],  # 采样返回
        }

    async def _run_strategy(self, config: dict) -> dict:
        """运行策略（实时或模拟）"""
        # TODO: 实现实时策略运行
        return {
            "status": "running",
            "strategyId": config.get("strategyId")
        }

    def _get_indicators(self, config: dict) -> dict:
        """获取技术指标列表"""
        return {
            "indicators": [
                {"name": "SMA", "description": "Simple Moving Average"},
                {"name": "EMA", "description": "Exponential Moving Average"},
                {"name": "RSI", "description": "Relative Strength Index"},
                {"name": "MACD", "description": "Moving Average Convergence Divergence"},
                {"name": "BBANDS", "description": "Bollinger Bands"},
                {"name": "ATR", "description": "Average True Range"},
                {"name": "ADX", "description": "Average Directional Index"},
            ]
        }


def main():
    """主入口"""
    engine = PythonEngine()
    asyncio.run(engine.run())


if __name__ == "__main__":
    main()
