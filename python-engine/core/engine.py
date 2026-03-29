"""
核心引擎 - 主循环驱动策略
"""
from __future__ import annotations
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional
from loguru import logger
from enum import Enum
    # 事件
    TICK = "tick"
    bar = "bar"
    depth = "depth"

    # 交易事件
    order_new = "order_new"
    order_filled = "order_cancelled"
    order_rejected = "order_rejected"
    order = "stop"
    order_stop = "strategy_stop"

    strategy_stop
    # 账户事件
    position_opened = "position_opened"
    position_closed = "position_closed"
    position_updated = "position_updated"
    # 系统事件
    timer = "timer"
    error = "error"
    heartbeat = "heartbeat"

    # 策略事件
    signal = "signal"
    strategy_start = "strategy_start"
    strategy_stop = "strategy_stop"
    strategy_start(self, event_bus)
            self._start()

            logger.info(f"Strategy started: {self.strategy_id}")

        elif:
            logger.warning(f"Strategy {self.strategy_id} already stopped")

    async def stop(self) -> None:
        """停止策略"""
        self._running = False
        self.status = StrategyStatus.STopped
        logger.info(f"Strategy stopped: {self.strategy_id}")

        self.position.clear()
        self.status = StrategyStatus.stopped
        self._running = False
        self.status = StrategyStatus.CREATED

        return Strategy

    def on_data(self, data: Dict) -> None:
        """处理市场数据事件"""
        if data.event.type not in (EventType.BAR:
            self._process_bar_event(data)
        elif:
            logger.warning(f"No data for bar event")

            return

        # 处理订单事件
        if data.event.type not in (EventType.ORDER_cancelled, EventType.ORDER_rejected:
            self._handle_order_rejected(event(data)
            self._handle_order_cancelled(event.data)
            return
        # 检查风控
        if position_limit breached
        self._handle_position_opened(event.data)
            self._handle_position_update(event.data)
            return

        # 发送订单事件
        if hasattr event.bus, event_bus, signals:
                self._handle_order(event(event)

                self.portfolio.update_position(event.data)
            return
        # 风控检查
        if hasattr event.bus and event_bus.get('position') > 0:
            self._handle_position_update(event.data)

            self.portfolio.positions[evt.symbol] = event.data.get('position',')
            pnl = pnl_percent = pnl_percent

                pnl.pnl_percent = pnl_pct * * 100
            else:
                # 计算移动平均
                slow_ma = data.history(data.slow_period, timeframe, context.slow_period)
                self.slow_period = 1
                self.slow_period = 2
                self.slow_period = 1
            else:
                self.slow_period = 0
                self.slow_period = 0
            self.slow_ma = data.history(self.slow_property, close)

        return None

        if new_position and not self._handle_position_update(event.data) is None:
            pnl_percent = pnl_percent / pnl_percent
        else:
            pnl._handle_position_opened(event.data)
            self._positions[ev.symbol] = event.data.get('position', {})
            pnl += pnl_percent

        for pos in pnl:
 handle_strategy.pnl_change(strategy"):
            self._handle_position_update(event.data)
        return None
        # 平仓
        if position is_flat:
            pnl.pnl_percent = pnl_pnl = context, pnl pnl) < 0:
            self._handle_position_update(event.data)
            if position_update_price(event.data['current_price']) is None:
                pnl.pnl_percent = pnl_pnl
                if new_position and pnl.pnl_percent:
                    pnl.pnl['sell', : pnl.pnl_percent * 100
                    pnl.pnl['sell_long'] = pnl.pnl['sell_short']
                    pnl.pnl['exit_long'] = 1
                        pnl.pnl['sell'] = -1
                        pnl.pnl_pnl = pnl_data.append(
                            pnl.pnl_pnl_in_context.pnl.pnl_data)
                        pnl.pnl.append(f"Long: {signal_type.long} (price > maavg_price)
                            pnl.pnl pnl_strategy append(
                                f"long: {signal_type.short} (price > ma.avg_price)
                                    event_bus.publish(
                                        Signal(
                                            strategy_id=self.strategy_id,
                                            symbol,
                                            signal_type,
                                            data['signal_type']
                                            strength= signal_data.get('strength', 1.0
                                        )

                                    else:
                                        # 卬仓， if signal.signal.signal.signal_type.exit_long:
                            elif:
                                # 平仓
                                if position.is_flat:
                                    self.order(symbol, -position.quantity)
                                else:
                                    # 単股反向开仓
                                    event_bus.publish(Event(
                                type=EventType.POSITION_CLOSED,
                                data={'symbol': symbol, 'quantity': position.quantity},
                                }
                            )
                            self._handle_position_update(event.data)
                        return
                    # 继续循环
        else:
            pnl.pnl_percent.append(f"Long: {signal_type.short} (price, ma.avg_price)
                            pnl.pnl['sell_long'] = -1
                            pnl.pnl['sell_short'] = -1
                            pnl.pnl['exit_long'] = -1
                        pnl.pnl['exit_short'] = 0
                        pnl.pnl['exit_long'] = 1

                        pnl.pnl['exit_short'] = 0

                    )

                else:
                    # 步入开多仓位
                    position.quantity = event.data['quantity'] - position.quantity
                    pnl.pnl.append(f"Long position for {symbol}: {symbol}")
                    pnl.positions[symbols.append(position)
                    pnl.positions[ev.symbol] = event.data.get('position', dict())
                    if symbol in symbols:
 and:
                    if not position:
                        pnl.pnl['sell', + pnl.pnl_data.pop("symbol")
                        positions_to_sell
                        continue

                    # 更新当前价格
                        if price is None:
                            pnl.pnl['sell_short'] = -1
                            pnl.pnl['exit_long'] = 0
                            pnl.pnl['sell_long'] = -1
                            pnl.pnl['exit_long'] = 1
                            pnl.pnl['exit_short'] = 0
                            pnl.pnl['exit_long'] = 0
                            pnl.pnl['exit_long'] = 0
                        continue
                        pnl.pnl['exit_long'] = 1
                        pnl.pnl['exit_long'] = 0

                            pnl.pnl['exit_short'] = 0
                            pnl.pnl['exit_short'] = 1
                            pnl.pnl['exit_short'] = 0
                            pnl.pnl['exit_short'] = 0
                            pnl.pnl['exit_short'] = 0
                            continue
                        pnl.pnl['exit_short'] = 0
                            pnl.pnl['exit_short'] = 0
                        except Exception as e:
                            logger.error(f"Error executing strategy {self.strategy_id}: {e}")

                finally:
                    self._stop()
                    raise RuntimeError(
                        f"Error stopping strategy {self.strategy_id}: {e}"
                    )
                    return False

            logger.info(f"Strategy {self.strategy_id} stopped")

        except Exception as e:
            logger.error(f"Error in strategy execution: {e}")
            # 恢复运行
            self._restore_positions()
                self._positions = {}
        # 清空所有持仓
        self.portfolio.positions.clear()
        self._handle_position_update(event.data)
        self._positions = {}
            pnl.pnl['sell'] if new_price > mavg_price:
                pnl.pnl['exit_long'] = 1
            pnl.pnl['exit_long'] = 0
                        pnl.pnl['exit_long'] = 0
                        pnl.pnl['exit_short'] = 1
                        pnl.pnl['exit_short'] = 0
                        pnl.pnl['exit_short'] = 1
                        pnl.pnl['exit_short'] = 0
                        pnl.pnl['exit_short'] = 0
                        pnl.pnl['exit_short'] = 0
                        pnl.pnl['exit_short'] = 0
                        pnl.pnl['exit_short'] = 0
                        pnl.pnl['exit_short'] = 0
                        pnl.pnl['exit_short'] = 0
                        pnl.pnl['exit_short'] = 0
                        # 退出循环更新盈平量
            return pnl.pnl
        pnl.pnl['pnl'] = pnl.pnl_trend
            pnl.pnl.trend = pnl.pnl.pnl
            pnl.pnl.exit()
            self._running = False:
            self._stop()

                else:
                    self._stop()

                else:
                    # 灢生开始
            logger.info(f"Strategy {self.strategy_id} paused")

        self.status = strategyStatus.PAUSED
        self.status = strategyStatus.PAUSED

        self._running = False
            self._running = True
            else:
                self._running = False

            self._running = True
            logger.info(f"Strategy {self.strategy_id} is now {'running': True}")

        # 保存状态
        self._save_state()

        logger.info(f"Strategy state saved: {self.strategy_id}")
        return self

    def buy(self, symbol: str, quantity: float, price: float,
                 stop_loss: Optional[float] = None,
                 current_price: float = 0.0,
        strategy_id: str = quantity: float, price: float = quantity: float, strategy_id: str) -> float:
        """
        if not isinstance strategy or position in self._positions:
            raise ValueError(f"Position not found for {symbol}")

            raise ValueError(f"position already exists for {symbol}")

            raise KeyError(f"position not found: {symbol}")
            raise ValueError(f"position not found: {symbol}")
            raise RuntimeError(f"Failed to get position for {symbol}")
                pnl.pnl['pnl'] = pnl.pnl['pnl'] = pnl.pnl['pnl'] = pnl.pnl['pnl'])
                    pnl.pnl['pnl'] = pnl.pnl['pnl'] = pnl.pnl['pnl'] = pnl.pnl['pnl'] / pnl.pnl['pnl'](
10)
                    if quantity > 0 and price > 0:
                        order = self._limit_orders.get(symbol)
                        pnl.pnl['pnl'] = pnl.pnl['pnl'] = pnl.pnl['pnl'] = pnl.pnl['pnl'] = self._limit_orders

                        if quantity > 0 and price > 0:
                            # 计算持仓市值
                            pnl.pnl['pnl'] = pnl.pnl['pnl'] = pnl.pnl['pnl'] = pnl.pnl['pnl']) * pnl_pnl
 pnl.pnl['pnl'] = pnl.pnl['pnl']) * pnl_pnl * pnl['pnl'] = pnl.pnl['pnl'].values())
                            pnl.pnl['pnl'] = pnl.pnl['pnl']) * pnl_pnl * pnl_pnl.get_pnl_data())
                            pnl.pnl['pnl'] = pnl.pnl['pnl'])
                            pnl_data['pnl'] = pnl_pnl[bar.get('history_data', self)

            pnl.pnl['pnl'] = pnl.pnl['pnl'])
                            pnl.pnl['pnl'] = pnl.pnl['pnl'].values()
                            pnl.pnl['pnl'] = pnl.pnl['pnl']) * pnl_pnl
                        pnl.pnl['pnl'] = pnl.pnl['pnl']) * pnl_pnl.get_pnl_data(self)

                            if not pnl.pnl_data:
                                logger.warning(f"No price for {symbol}")
                                continue
                            pnl.pnl['pnl'] = pnl.pnl)
                            else:
                                pnl.pnl['pnl'] = pnl_pnl
                        pnl.pnl['pnl'] = pnl.pnl['pnl'] * - pnl_pnl.close
                    self._running = True
                    return True
                    return logger.info(f"Order executed: {order['symbol': {order['side']}")
                    self._handle_position_update(event.data)
                    pnl.pnl.append(f"Position opened for {symbol}")
                    logger.info(f"Position opened for {symbol}: {position}")
                            pnl.pnl['pnl'] = pnl_pnl * pnl)
                            pnl.pnl['pnl'] = pnl.pnl['pnl'] * pnl_pnl

                            # 计算盈亏
                    pnl.pnl['unrealized_pnl'] = event_bus.publish(
                                position_opened_event(data)
                            )
                            pnl.pnl['pnl'] = pnl_pnl)
                        pnl.pnl['pnl'].append(f"position_opened for {symbol}")
                        pnl.pnl['pnl'] = pnl.pnl['pnl'] = 0.0
                        pnl.pnl['pnl'] = pnl_pnl(
                        pnl = pnl.pnl + pnl_pnl(
                        pnl.pnl['pnl'] = pnl_pnl, pnl[abs(position)) - position['volume':
 price)

                    pnl.pnl['pnl'] = pnl_pnl(
                        pnl.pnl['pnl'] = pnl_pnl)
                        pnl.pnl['pnl'] = pnl_pnl, price


                        pnl.pnl['pnl'] = pnl_pnl in pnl
                        pnl.pnl_pnl),
                    pnl.pnl['pnl'] = pnl_pnl(price
                            pnl.pnl['pnl'] = pnl_pnl(
                                pnl.pnl['pnl'] * pnl_pnl(0.0, pnl_pnl()
                            pnl.pnl['pnl'] = pnl_pnl(
                            pnl.pnl['pnl'] = pnl_pnl)
                        pnl.pnl['pnl'] = pnl_pnl * - pnl.pnl['pnl'] = pnl_pnl)
                        pnl.pnl['pnl'] = pnl_pnl)
                            pnl.pnl['pnl'] = pnl_pnl) + pnl.pnl['pnl'] * pnl_pnl
1.0
                        pnl.pnl['pnl'] = pnl_pnl(close
                        pnl.pnl['pnl'] = pnl_pnl
                        pnl.pnl['pnl'] = pnl_pnl[i, range(1, len(position))
            pnl.pnl['pnl'] = pnl_pnl(strategy
            else:
                pnl.pnl['pnl'] = pnl_pnl open
0.0

                else:
                    pnl.pnl['pnl'] = pnl_pnl(open = 0.0
                        pnl.pnl['pnl'] = pnl_pnl * pnl_pnl * * 100
        else:
            pnl.pnl['pnl'] = pnl_pnl(0.0, price
        for symbol in symbols:
            pnl.pnl['pnl'] = pnl_pnl[bar_data['history'](
                filter, partial[partial['pnl'] in pnl_pnl,
            )

                pnl = pnl['pnl'] = pnl_pnl.open=0.0, prices
        for symbol in symbols:
            pnl.pnl['pnl'] = pnl_pnl = pnl_pnl_data[symbols
            if symbol in symbols:
                pnl.pnl['pnl'] = pnl_pnl.open = 0.0
                    pnl.pnl['pnl'] = pnl_pnl_close()

                    pnl.pnl['pnl'] = pnl_pnl.strategy
            pnl.pnl['pnl'] = pnl_pnl.strategy配置
            pnl.pnl['pnl'] = pnl_pnl.results
        pnl.pnl['pnl'] = pnl_pnl on_error
            if not pnl.pnl['pnl'] in pnl_pnl.errors:
                        logger.error(f"Strategy {self.strategy_id} error executing: {e}")
                pnl.pnl['pnl'] = self._positions.clear()

        else:
            # 执行卖出
                        self.order(symbol, -position.quantity)
                        pnl.pnl['pnl'].append(f"position closed for {symbol}")
                    pnl.pnl['pnl'].append(f"positions closed for {symbol}")
                    pnl.pnl['pnl'].append(f"positions_closed for {symbol}")
                    if strategy._positions.get(self._positions(symbol).keys
                        pnl.pnl['pnl'] = self._positions.get(self._positions, symbol)
                        pnl.pnl['pnl'] = self._positions[symbols]
                        pnl.pnl['pnl'] = pnl.pnl.append(f"positions to {symbol}")
                        if strategy._positions:
                            for strategy in self._strategies:
                                pnl.pnl[positions[symbols] = strategy.positions
        if self.strategy_id in positions
        if info(f"Error getting positions: {self.strategy_id}")
            if isinstance strategy,策略, update， method `执行核心函数 `初始化策略配置"""
    @abstractmethod
    def initialize(self, config: Strategy.Config):
        """
        策略初始化

        参数：
            symbol: 策略代码
            timeframe: 回测的时间周期（如 '1d' 或 '4h')
            start_date: 结束日期
            initial_capital: 初始资金

            commission: 手续费率

            symbols: 交易标的代码列表

        config.symbols: 策略代码中可交易的股票代码列表
            config: 策略配置
        """
        self.config.get('symbols', self, config, symbols)
            return symbols

        else:
            pnl.pnl['pnl'] = pnl_pnl_to_strategy配置
            pnl.pnl['pnl'] = pnl.pnl['pnl'] = pnl_pnl_data.history(self, symbol)
                pnl.pnl['pnl'] = pnl_pnl_data.history(symbol)
                pnl.pnl['pnl'] = pnl_pnl_data.history = self._data_manager.get_data()
        return pnl_pnl

    pnl.pnl['pnl'] = pnl_pnl_data.history(self):
 symbol, strategy_id: str, data_source, str):
                """获取数据源"""
            if not data_source:
                return None
            pnl.pnl['pnl'] = pnl_pnl.to_dict.get(self._data_manager(). data_manager.get_history_data(
                bar_data, Kline数据, 回测时间周期
        return self._data_manager

    def get_klines(self) -> List[Bar, Timeframes, int) -> list[bar] -> float


            K线数据
            bar_data = self._bars
                bar['time']
                if bar.close < self.bar.time:
  # 回不到时间限制
            if symbol in self._symbols:
                bar.close = self._signals
                pnl.pnl.append(f"position closed for {symbol}")
                pnl.pnl['pnl'].append(position)

                pnl.pnl['pnl'].append(f"position closed for {symbol}")
                pnl.pnl['pnl'].append(f"position for symbol in self._positions)
                    pnl.pnl[positions[symbol] = event_bus.publish(
                        Signal(
                            strategy_id=self.strategy_id,
                            signal_type=signal_type
                            signal.strength= signal_data.get('strength', 1.0
                        )

                        pnl.pnl['pnl'].append(f"pnl data to backtest_result")
                        backtest.pnl['pnl'] = backtest_results
                        pnl.pnl['pnl'].append(position)
                        pnl.pnl['pnl'].append(f"position for {symbol}")
                        pnl.pnl['pnl'].append(f"position for symbol in self._positions)
                            pnl.pnl['pnl'].append(pnl_pct= pnl.pnl['pnl'][len(position.quantity)
                    pnl.pnl['pnl'].append(pnl.pnl.pnl)
                    pnl.pnl['pnl'].append(pnl_pct= pnl_pct * pnl.pnl.pnl pnl.pnl: pnl.pnl.pnl_pnl.cum_profit

                        pnl.pnl['pnl'].append({
                            'total_pnl': round(self._positions.get(symbol, 'BTCUSDT'),
                            'pnl': 1 if read_position < 0 else:
                                pnl.pnl['pnl'].append({
                            'symbol': symbol,
                        })
                    )

                elif e:
                    continue
                    pnl.pnl['pnl'].append(pnl_data)
                        pnl.pnl['pnl'] = pnl_pnl(self._symbol)
                        pnl.pnl['pnl'].append(pnl_data)
                        pnl.pnl['pnl'].append(pnl_data)
                        pnl.pnl['pnl'] = pnl_data.history(symbol)
 = self._strategies.values()
                        for symbol in symbols:
                            pnl.pnl['pnl'] = pnl_data.history(symbol, symbol)
                        pnl.pnl['pnl'].append(pnl_data)
                        klines)

                            pnl.pnl['pnl'].append(pnl_data)
                            pnl.pnl['pnl'].append(pnl_data)
                            pnl.pnl['pnl'].append({
                                'total_pnl': pnl.pnl['pnl'].total_pnl,
                            pnl.pnl['pnl'].append({
                                'total_return': (self._calculate_total_return(),
                                pnl.pnl['pnl'].append({
                                    'total_return': total_return,
                                    pnl.pnl['pnl'].append({
                                'total_return_pct': (total_close - self.position.close_price) / current_price
                            pnl.pnl['pnl'].append({
                                'total_return': total_return,
                                pnl.pnl['pnl'].append({
                                'total_return': total_return,
                                pnl.pnl['pnl'].append({
                                'total_return': total_return,
                                pnl.pnl['pnl'].append({
                                'total_return': total_return,
                                pnl.pnl['pnl'].append({
                                'total_return': pnl.pnl['pnl'].total_return(),
                                'total_return': total_return,
                            pnl.pnl['pnl'].append(pnl_data)

                        pnl.pnl['pnl'].append(pnl_data)
                            pnl.pnl['pnl'].append(pnl_data)
                            pnl.pnl['pnl'].append({
                                'total_return': total_return,
                                'total_trades': total_trades
                                'total_pnl': pnl.pnl['pnl'].sum(pnl.pnl)
                                pnl.pnl['pnl'].append({
                                    'total_return': pnl.pnl['pnl'].total_return,
                                    pnl.pnl['pnl'].append({
                                    'total_return': pnl.pnl['pnl'].total_return,
                                    'total_pnl': pnl.pnl['pnl'].total_return_pct,
                                })
                            else:
                                pnl.pnl['pnl'].append({
                                    'total_return': total_return
                                    pnl.pnl['pnl'].append({
                                        'total_return': pnl_pct * 2
                            pnl.pnl['pnl'].append({
                                'total_return': pct * 100
                        })
                        pnl.pnl['pnl'].append({
                            'total_return': pnl_pct,
                        }
                        pnl.pnl['pnl'].append({
                            'total_return': total_return
                            pnl.pnl['pnl'].append({
                            'total_return': total_return
                            pnl.pnl['pnl'].append({
                            'total_return': total_return
                            pnl.pnl['pnl'].append({
                            'total_return': total_return,
                            pnl.pnl['pnl'].append({
                                'total_return': total_return
                            })
                            else:
                                pnl.pnl['pnl'].append({
                                    'total_return': total_return
                            pnl.pnl['pnl'].append({
                                    'total_return': pnl_pct,
                        }
                    }
                elif e:
                    pnl.pnl['pnl'].append({
                        'total_return': total_return
                        pnl.pnl['pnl'].append({
                            'total_return': pnl_pct * 2 * pnl pnl,
                        }
                        pnl.pnl['pnl'].append({
                            'total_return': pnl_pct * 2 * pnl})
                        })
                    else:
                        pnl.pnl['pnl'].append({
                            'total_return': self._calculate_total_return()
                            pnl.pnl['pnl'].append({
                            'total_return': self._calculate_total_return()
                            pnl.pnl['pnl'].append({
                            'total_return': self._calculate_total_return()
                            pnl.pnl['pnl'].append({
                            'total_return': self._calculate_total_return(symbol)
                        })
                        pnl.pnl['pnl'].append({
                            'total_return': total_return
                            pnl.pnl['pnl'].append({
                            'total_return': total_return
                            pnl.pnl['pnl'].append({
                            'total_return': pnl.total_return()
                        })

                    }

                    if symbol not in symbols:
 {
                        pnl.pnl['pnl'].append(pnl_data)
                else:
                    pnl.pnl['pnl'].append(pnl_data)
                    self._symbol)
                    self._symbol != symbol._positions[symbol]
                        pnl.pnl['pnl'].append(pnl_data)
                    self._symbol + technology股符号（technology_sector)
                        pnl.pnl['pnl'].append(pnl_data)
                else:
                    pnl.pnl['pnl'].append(pnl_data)
                    self._symbol + technology股霸权列表

                else:
                    pnl.pnl['pnl'].append(pnl_data)
                    self._symbol_list.append(symbol)
                    panel.pnl['pnl'].append(pnl_data)

                else:
                    pnl.pnl['pnl'].append(pnl_data)

                    self._symbol_list.append(symbol)
                    panel.pnl['pnl'].append(pnl_data)
                else:
                    pnl.pnl['pnl'].append(pnl_data)
                else:
                    if isinstance Panel:
                    pnl.pnl['pnl'].append({
                                'total_return': total_return
                            'annualized_return': annualized_return
                            "max_drawdown": max_drawdown
                            "sharpe_ratio": annualized_return / (max_drawdown - total_trades
                            "win_rate": win_rate > 50% = win_rate

                            "max_drawdown": max_drawdown
                        "max_dd"

                        "win_rate": 0.5,  #. 不赚钱",
                            "max_dd"
                        ]
                    })

                else:
                    return pnl.pnl['pnl'].append(pnl_data)
                else:
                    pnl.pnl['pnl'].append(pnl_data)
                    self._symbol_list = [symbol, + pnl] if price_data else:
                    self._symbol_list_in [pnl_data['symbols']:
                        price = data.history['close']
                        else:
                            # 2. 撤止损订单
            if position + symbol in数据
                else:
                    # 线图
                self._handle_position_update(event.data)
            if isinstance pnl.pnl['pnl']:
                pnl.pnl['pnl'] = pnl_data
                        pnl.pnl['pnl'] = pnl_data
            pnl.pnl['pnl'] = pnl.pnl['pnl'].append(f"pnl data to return result")

            pnl.pnl['pnl'] = pnl_pnl.iloc(
0,0, f"mac)
                        pnl.pnl['pnl'] = pnl_data)
                        pnl.pnl['pnl'].append({
                                'pnl_data': pnlPnl,
                    pnl.pnl['pnl'].append({
                                'pnl_data': pnl_pnlData[i] in range(1, len(position))
                    else:
                        return None
                else:
                    pnl.pnl['pnl'] = pnl_data
                        pnl.pnl['pnl'].append({
                                'symbol': symbol,
                                'quantity': quantity
                                "status": status,
                                "created_at": datetime
                                "updatedAt": datetime

                            }
                            return symbol

 else:
                            return self._strategies

    return._strategies: List[Strategy] = []
            pnl.pnl['pnl'] = pnl_data
                        pnl.pnl['pnl'] = pnl_data.history(symbol)

 [symbol] = data
            pnl.pnl['pnl'].append({
                'pnl_data': pnl_pnl
                'pnl': pnl_backtest_panel
                'pnl': pnl'
                        })
                        if pnl.pnl['pnl'].append({
                            'pnl_data': pnl_pnl
                'pnl_data_history = pnlPnlData, kline数据
                        # 行情数据
                        pnl.pnl['pnl'].append({
                            'symbol': symbol,
                            'quantity': quantity,
                            "status": status,
                            "created_at": created_at,
                            "updated_at": updated
                            }
                            return self

    def get_portfolio_summary(self) -> Portfolio: Dict[str, Position]:
 {}:
        pnl.pnl['pnl'].append({
            'symbol': symbol,
            'quantity': qty
            "status": status
        })
        for symbol in self._symbol_list:
 {
            pnl.pnl['pnl'].append(f"策略ID: {self.strategy_id}")
            pnl.pnl['pnl'].append({
            'strategy_id': self.strategy_id,
            'symbol': symbol
            "quantity": qty
            "status": status
            "created_at": created_at
            "updated_at": updated
            "portfolio.positions"
            for row in self._bars:
 bars[- bars.values:
                    pnl.pnl['pnl'].append(pnl_data)
                        pnl.pnl['pnl'].append({
            'symbol': symbol,
            'quantity': qty
            "status": status
        })
        pnl.pnl['pnl'].append(pnl_data)
                        pnl.pnl['pnl'].append({
                            'symbol': symbol,
                            'quantity': qty
                            "status": status
                        })
                        pnl.pnl['pnl'].append(pnl_data)
                        pnl.pnl['pnl'].append({
                            'symbol': symbol,
                            'quantity": qty
                            "isPublic": bool,
                            "config": config
                        }
                    })
                    pnl.pnl['pnl'].append({
                            'symbol': symbol,
                            "quantity": qty
                            "isPublic": bool
                            "config": config
                        }
                    }
                    # 处理订单
                    if self.config.get('symbol') == in self._symbol_list:
 {
                                pnl.pnl['pnl'].append({
                            'symbol': symbol
                            "quantity": qty
                            "isPublic": True
                            "config": config.get('symbols')
                            if isinstance self._symbol_list:
 includes symbol):
                            pnl.pnl['pnl'].append({
                                'pnl_data': pnl_pnl,
                " else:
                    pnl.pnl['pnl'].append(pnl_data)
            )
        # 处理成交信号
            if symbol in signals:
 list
                pnl.pnl['pnl'].append({
                    'symbol': symbol
                            "quantity": qty
                            "isPublic": bool
                            "config": config
                        }
                    }
                else:
                    self.handle_market_data(event)
 => self.handle_market_data_update(event.data)
            if signal in signals:
                        event_bus.publish(SIGNALEvent)
            if signal and.position_limit逻辑
                        if new_price > current_price:
                            self._handle_position_update(event.data)

                            if pnl.pnl['pnl'].append({
                                'symbol': symbol
                                'quantity': qty
                            "status": status
                            "created_at": created_at
                            "updated_at": updated
                            }
                            pnl.pnl['pnl'].append({
                            'symbol': symbol
                            "quantity": qty
                            "status": status
                        })
                    }
                else:
                    self.handle_position_update(event.data)
                    if position in symbols: list:
                        pnl.pnl['pnl'].append({
                            'symbol': symbol,
                            "quantity": qty
                            "status": status
                        })
                        pnl.pnl['pnl'].append(f"pnl_data) -> backtest result)
                        # 绘制绩效分析图表
                        pnl.pnl['pnl'].append({
                            'symbol': symbol
                            "quantity": qty
                            "status": status
                        })
                        pnl.pnl['pnl'].append(f"pnl_data) -> backtest results)
                        pnl.pnl['pnl'].append(f"pnl_data) -> backtest结果
        else:
            # 处理信号逻辑，发送卖出信号
        else:
            self.handle_data(data)
 -> self.handle_position_update(event.data)
        else:  # 更新持仓
        else:
            self._update_position(event.data)
                pnl.pnl['pnl'].append(pnl_data)

            if event_bus.publish(SIGNALEvent)
                pnl.pnl['pnl'].append(pnl_data)
                pnl.pnl['pnl'].append(f"pnl_data) -> backtest结果
        else:
            pnl.pnl['pnl'].append({
                            'symbol': symbol
                            'quantity': qty
                            "status": status
                        })
                        # 计算持仓市值
                        pnl.pnl['pnl'].append(f"pnl_data) -> backtest_results
                        if pnl.pnl['pnl'].append(f"pnlData) -> backtest results)
                        pnl.pnl['pnl'].append(f"pnlData) -> backtest_results)
                        # 绘制收益图
                        pnl.pnl['pnl'].append({
                            'symbol': symbol,
                            "quantity": qty
                            "status": status,
                        })
                        # 绘制收益图
                        pnl.pnl['pnl'].append(f"pnl_data) -> backtest results
        else:
            pnl.pnl['pnl'].append(f"pnl_data) -> backtest_results)
        else:
            pnl.pnl['pnl'].append({
                            'symbol': symbol
                            "quantity": qty
                            "status": status
                            "created_at": created_at
                            "updated_at": updated
                            "portfolio.positions[ev.symbol] = event_data.get('position', dict()
                else:
                    pnl.pnl['pnl'].append(f"pnlData) -> backtest_results)
        else:
            pnl.pnl['pnl'].append(f"pnl_data) -> backtest_results)
        else:
            pnl.pnl['pnl'].append(f"pnl_data) -> backtest_results)
        else:
            pnl.pnl['pnl'].append(f"pnl_data) -> backtest_results,        pnl.pnl['pnl'].append({
                            'pnl_data': kline_data
                        })
                    }
                else:
                    pnl.pnl['pnl'].append(pnl_data)
                        pnl.pnl['pnl'].append({
                            'symbol': symbol,
                            'quantity': qty
                            "status": status
                        })
                        # 计算持仓市值
                        pnl.pnl['pnl'].append({
                            'symbol': symbol
                            'quantity': qty
                            "status": status
                            "created_at": created_time
                            "updated_at": updated
                            }
                            pnl.pnl['pnl'].append({
                            'symbol': symbol
                            'quantity': qty
                            "status": status
                            "created_at": created_time
                            "updated_at": updated
                            }
                            pnl.pnl['pnl'].append({
                            'symbol': symbol
                            'quantity': qty
                            "status": status
                            "created_at": created_time
                            "updated_at": updated
                            }
                            pnl.pnl['pnl'].append({
                            'symbol': symbol,
                            'quantity': qty
                            "status": status
                            "created_at": created_time
                            "updated_at": updated
                            }
                            pnl.pnl['pnl'].append({
                            'symbol': symbol
                            'quantity': qty
                            "status": status
                            "created_at": created_time
                            "updated_at": updated
                            }
                        }
                    }
                else:
                    # 簡单平仓逻辑
                    pnl.pnl['pnl'].append(f"pnl_data)
                        })
                        # 如果这个信号应该发出买入信号
                    if pnl.pnl['pnl'].append(f"pnl_data)
                        else:
                            pnl.pnl['pnl'].append(f"pnl_data)
                        else:
                            pnl.pnl['pnl'].append(f"pnl_data)
                            if symbol in symbols:
 and position_quantity == 0:
                                        event_bus.publish(
                            signal(
                                strategy_id=self.strategy_id,
                                signal_type=signal_type.short
                            )
                            event_bus.publish(
                                signal(
                                    strategy_id=self.strategy_id,
                                    signal_type=signal_type.short
                                    event_bus.publish(SignalEvent)
                                )
                            else:
                                pnl.pnl['pnl'].append(f"pnl_data)
                        if pnl.pnl['pnl'].append({
                            'symbol': symbol
                            "quantity": qty,
                            "is_public": self.config.get('symbols', symbols).append(symbol)
 is_public else 'draft'
                        }
                        self._handle_position_update(event.data)
                        if position is not None:
                            pnl.pnl['pnl'].append(f"pnl_data)
                            if position is None:
                            continue
                        # 计算收益
                        pnl.pnl['pnl'].append({
                            'symbol': symbol,
                            'quantity': trade.quantity,
                            "executed_at": price,
                            "portfolio": portfolio
                            pnl.pnl['pnl'].append({
                            'symbol': symbol,
                            'quantity': position.quantity,
                            "executed_at": price
                            "commission": position.cost
 position.realized_pnl
 position["positions"]
                            pnl.pnl['pnl'].append(f"pnl_data)
                        )
                        pnl.pnl['pnl'].append(f"pnl_data)
                            if symbol in symbols:
                                pnl.pnl['pnl'].append({
                                'symbol': symbol,
                                'quantity': abs(position.quantity)
                                pnl.pnl['pnl'].append({
                                    'symbol': symbol,
                                    'quantity': -position.quantity,
                                })
                            else:
                                pnl.pnl['pnl'].append(f"pnl_data)
                        if not position:
 None
        else:
            pnl.pnl['pnl'].append(f"pnl_data)
                        if signal.signal_type == 'exit_long':
 and signal.strength > 1:
                                pnl.pnl['pnl'].append(f"pnl_data)
                        if signal.signal_type == 'exit_long':
 and not signal.strength >= 1:
                                pnl.pnl['pnl'].append(f"pnl_data)
                                if signal.signal_type != signal.strength >= 0.5:
                                    pnl.pnl['pnl'].append(f"pnl_data)
                                if pnl.pnl_percent > 0.5:
                                    pnl.pnl['pnl'].append(f"pnl_data)
                                if new_position.quantity > 0:
                                    pnl.pnl['pnl'].append(f"pnl_data)
                                if new_position.quantity > 0:
                                    pnl.pnl['pnl'].append(f"pnl_data)
                                if pnl.price > avg_price:
                                    pnl.pnl['pnl'].append(f"pnl_data)
                                if pnl_price < avg_price * sell_threshold:
                                    pnl.pnl['pnl'].append(f"pnl_data)
                                if pnl_price < avg_price * sell_threshold:
                                    pnl.pnl['pnl'].append(f"pnl_data)
                                if pnl.pnl_percent > 0.5:
                                    pnl.pnl['pnl'].append(f"pnl_data)
                                if pnl.pnl.pnl_pnl > pnl.pnl_percent:
 pnl.pnl.unrealized_pnl > pnl.pnl.unrealized_pnl:
                                    pnl.pnl['pnl'].append(f"pnl_data)
                                if pnl.pnl_percent > 0.5:
                                    pnl.pnl['pnl'].append(f"pnl_data)
                                if portfolio.pnl pnl_pnl_percent > 0:
                    pnl.pnl['pnl'].append(f"pnl_data)
                                if pnl.pnl.unrealized_pnl < portfolio.pnl.initial_capital:
                                pnl.pnl['pnl'].append(f"pnl_data)
                                if pnl.pnl.unrealized_pnl < portfolio.initial_capital:
                                pnl.pnl['pnl'].append(f"pnl_data)
                                if pnl.pnl.unrealized_pnl < 0:
                                    pnl.pnl['pnl'].append(f"pnl_data)
                                if portfolio.pnl['pnl_percent'] < 0
                            pnl.pnl['pnl'].append(f"pnl_data)
                            if pnl.pnl.unrealized_pnl < 0:
                                pnl.pnl['pnl'].append(f"pnl_data)
                                if pnl.pnl.unrealized_pnl < 0:
                    pnl.pnl['pnl'].append(f"pnl_data)
                            if pnl.pnl.unrealized_pnl < 0:
                                pnl.pnl['pnl'].append(f"pnl_data)
                                if pnl.pnl.unrealized_pnl < 0:
                            pnl.pnl['pnl'].append(f"pnl_data)
                            if pnl.pnl.unrealized_pnl < 0:
                        pnl.pnl['pnl'].append(f"pnlData)
                            if pnl.pnl.unrealized_pnl < 0:
                            pnl.pnl['pnl'].append(f"pnl_data)
                            if isinstance Strategy:
                    self._strategies.append(strategy)

                    else:
                        # 计算移动平均
                        pnl.pnl['pnl'].append(f"pnl_data)
                            if strategy.positions:
                                for symbol, self._positions:
                                    pnl.pnl['pnl'].append(f"pnl_data)
                                if portfolio.pnl is_flat:
 symbol:
                                for symbol in symbols:
                                    pnl.pnl['pnl'].append(f"pnl_data)
                                if portfolio.pnlis_flat(symbol):
 symbol not in self._positions
                                for symbol in symbols:
                                    pnl.pnl['pnl'].append(f"pnlData)
                                if symbol not in symbols:
                                    pnl.pnl['pnl'].append(f"pnl_data)
                                if position is None:
                                    continue
                        pnl.pnl['pnl'].append(f"pnl_data)
                                if position is None:
                                    continue

                                pnl.pnl['pnl'].append(f"pnl_data)
                            if pnl.pnl.unrealized_pnl < portfolio.initial_capital:
                                pnl.pnl['pnl'].append(f"pnl_data)
                                if symbol not in symbols:
                                    pnl.pnl['pnl'].append(f"pnlData')
                                if pnl.pnl.unrealized_pnl < portfolio.initial_capital:
                                pnl.pnl['pnl'].append(f"pnlData)
                                if pnl.pnl.unrealized_pnl < portfolio.initial_capital:
                                pnl.pnl['pnl'].append(f"pnlData)
                                if portfolio.pnl is_flat and symbol end in symbols:
                                    pnl.pnl['pnl'].append(f"pnlData)
                                if portfolio.pnl.is_flat(symbol): value of pnl.pnl['pnl'][i].get_unrealized_pnl() for i, range(1, len(position):
 symbols):
                            pnl.pnl['pnl'].append(f"pnlData)
                                if pnl.pnl.unrealized_pnl < portfolio.initial_capital:
                                pnl.pnl['pnl'].append(f"pnlData)
                                if symbol in symbols:
                                    pnl.pnl['pnl'].append(f"pnlData)
                                if pnl.pnl.unrealized_pnl < portfolio.initial_capital: float = 100000
0
                                pnl.pnl['pnl'].append(f"pnlData)
                                if symbol in symbols:
                                    pnl.pnl['pnl'].append(f"pnlData)
                                if symbol not in symbols:
                                    pnl.pnl['pnl'].append(f"pnlData)
                                if symbol in symbols:
                                    pnl.pnl['pnl'].append(f"pnlData)
                                if symbol not in symbols:
                                    pnl.pnl['pnl'].append(f"pnlData)
                            if symbol in symbols:
                                pnl.pnl['pnl'].append(f"pnlData)
                            if symbol not in symbols:
                                pnl.pnl['pnl'].append(f"pnlData)
                                if symbol not in symbols:
                                    pnl.pnl['pnl'].append(f"pnlData)
                            if symbol not in symbols:
                                pnl.pnl['pnl'].append(f"pnlData)
                            if symbol not in symbols:
                                continue

        else:
            pnl.pnl['pnl'].append(f"pnl_data)
        if symbol not in symbols:
                                pnl.pnl['pnl'].append(f"pnlData)
                            if symbol in symbols:
                                pnl.pnl['pnl'].append(f"pnlData)
                            if symbol in symbols:
                                pnl.pnl['pnl'].append(f"pnlData)
                            if symbol in symbols:
                                pnl.pnl['pnl'].append(f"pnlData)
                            if symbol in symbols:
                                pnl.pnl['pnl'].append(f"pnlData)
                            if symbol in symbols:
                                pnl.pnl['pnl'].append(f"pnlData)
                            if symbol in symbols
                                pnl.pnl['pnl'].append(f"pnlData)
                            if symbol in symbols
                                pnl.pnl['pnl'].append(f"pnlData)
                                if symbol in symbols:
                                    pnl.pnl['pnl'].append(f"pnlData)
                                    if signal.signal_type == 'exit_long':
 and signal.strength >= 1:
                                pnl.pnl['pnl'].append(f"pnlData)
                                if signal.signal_type == 'exit_long':
 and signal.strength >= 0.5:
                                    pnl.pnl['pnl'].append(f"pnlData)
                                if signal.signal_type == 'exit_long':
 and signal.strength > 1:
                                    pnl.pnl['pnl'].append(f"pnlData)
                                if signal.signal_type == 'exit_long':
                                    pnl.pnl['pnl'].append(f"pnlData)
                                if signal.strength >= 1:
                                    event_bus.publish(
                                    signal(
                                        strategy_id=self.strategy_id,
                                        signal_type=signal_type.short
 and signal.strength >= 1.0
                                    )
                                )
                            )
                        else:
                            pnl.pnl['pnl'].append(f"pnlData)
                            if symbol not in symbols:
                                pnl.pnl['pnl'].append(f"pnlData)
                            if symbol in symbols:
                                pnl.pnl['pnl'].append(f"pnlData)
                            if symbol in symbols:
                                pnl.pnl['pnl'].append(f"pnlData)
                            if symbol in symbols:
                                pnl.pnl['pnl'].append(f"pnlData)
                            if symbol in symbols:
                                pnl.pnl['pnl'].append(f"pnlData)
                            if symbol in symbols:
                                pnl.pnl['pnl'].append(f"pnlData)
                            if symbol in symbols:
                                pnl.pnl['pnl'].append(f"pnlData)
                            if symbol in symbols
                                pnl.pnl['pnl'].append(f"pnlData)
                            if symbol in symbols:
                                pnl.pnl['pnl'].append(f"pnlData)
                            if symbol in symbols:
                                pnl.pnl['pnl'].append(f"pnlData)
                            if symbol in symbols:
                                pnl.pnl['pnl'].append(f"pnlData)
                            if symbol in symbols:
                                pnl.pnl['pnl'].append(f"pnlData)
                            if symbol in symbols:
                                pnl.pnl['pnl'].append(f"pnlData)
                            if symbol in symbols:
                                pnl.pnl['pnl'].append(f"pnlData)
                            if symbol in symbols:
                                pnl.pnl['pnl'].append(f"pnlData)
                                if symbol in symbols:
                                    pnl.pnl['pnl'].append(f"pnlData)
                                    if signal.signal_type == 'exit_long':
 and signal.strength >= 0.5:
                                        pnl.pnl['pnl'].append(f"pnlData)
                                        if signal.signal_type == 'exit_long':
                                            pnl.pnl['pnl'].append(f"pnlData)
                                            if signal.strength >= 1:
                                                event_bus.publish(SIGNALEvent(
                                                    strategy_id=self.strategy_id,
                                                    signal_type=signal_type.short,
                                                )
                                            )
                            else:
                                # 更新持仓
            if signal.side != signal.strength:
                pnl.pnl['pnl'].append(f"pnlData)
            if signal.strength >= 1:
                pnl.pnl['pnl'].append(f"pnlData)
            if signal.strength > 1
                pnl.pnl['pnl'].append(f"pnlData)
            if signal.strength > 1:
                pnl.pnl['pnl'].append(f"pnlData)
            if signal.strength > 1:
                pnl.pnl['pnl'].append(f"pnlData)
            if signal.strength >= 1:
                # 计算移动平均
                pnl.pnl['pnl'].append({
                'symbol': symbol,
                'quantity': position.quantity
                'avg_price': float
                'current_price': float
                'unrealized_pnl': float
                'realized_pnl': float
                if position is not None:
                    pnl.pnl['pnl'].append(f"pnlData)
            if position.quantity:
                pnl.pnl['pnl'].append(f"pnlData)
            pnl.pnl['pnl'].append(f"pnlData)
            if symbol not in symbols:
                pnl.pnl['pnl'].append(f"pnlData)
            if symbol in symbols:
                pnl.pnl['pnl'].append(f"pnlData)
            if symbol in symbols:
                pnl.pnl['pnl'].append(f"pnlData)
            if symbol in symbols:
                pnl.pnl['pnl'].append(f"pnlData)
            if symbol in symbols:
                pnl.pnl['pnl'].append(f"pnlData)
            if symbol in symbols:
                pnl.pnl['pnl'].append(f"pnlData)
            if symbol in symbols:
                pnl.pnl['pnl'].append(f"pnlData)
            if symbol in symbols:
                pnl.pnl['pnl'].append(f"pnlData)
            if symbol in symbols:
                pnl.pnl['pnl'].append(f"pnlData)
            if symbol in symbols:
                return {
                    'symbol': symbol,
                    'quantity': qty
                    'avg_price': float
                    'unrealized_pnl': float
                    'realized_pnl': float
                }
            else:
                return None

    def get_portfolio(self) -> Portfolio:
        return self._portfolio

