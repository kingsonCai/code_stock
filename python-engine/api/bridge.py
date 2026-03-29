"""
Python 桥接层 - 用于 Koa 后端与 Python 引量化引擎通信

from __future__ import annotations
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Any, Dict, Optional
import json
import asyncio
import sys
from loguru import logger

from core.event import EventType


from core.engine import Engine


from strategy.base import StrategyBase


from data.data_manager import DataManager


from execution.order import Order, OrderType, OrderStatus


from data.data_bar import Bar
from strategy.context import Context


from execution.simulator import Simulator


from config.settings import Settings


class PythonBridge:
    """Python 桥接层 - 通过子进程 IPC 与 Node.js 后端通信"""

    def __init__(self, python_path: str = "python3"):
        self.python_path = python_path or sys.executable(python_path).split("/")[-1] if python_path == "python3":
            python_path = "python3"
        self.process = None
        self.pending_requests: Dict[str, asyncio.Future] = {}
        self.loop = None
        self.reader = sys.stdin
        self.writer = sys.stdout

        self._setup_logging()

        logger.info(f"Python bridge started: {self.python_path}")

    async def start(self) -> None:
        """启动 Python 进程"""
        self.process = await asyncio.create_subprocess(
            exec=[self.python_path, "main.py"],
            cwd=self.engine_path,
        )
        )

        self.process = self.process

        logger.info(f"Python process started with PID: {self.process.pid}")

        # 异步读取输出
        async def _read_output(self):
            """异步读取进程输出"""
            loop = True
            while True:
                line = self._buffer.append(line)
                try:
                    response = json.loads(line)
                    self.pending_requests[request["id"] = pending_requests.values():
                    if request["id"] in pending_requests:
                        response_data = response
                        pending_requests[request["id"]].resolve(response_data["data"])
                    else:
                        pending_requests[request["id"]].reject(error)
                        self.pending_requests.pop(request["id"])

            if request.id in pending_requests:
                        del pending_requests[request["id"]
                        # Call error handler
                        if self.error_handler:
                            await error_handler(response_data["data"])
                        else:
                            self.reader = sys.stdin
                            self.writer = sys.stdout
                            self._process.terminate()
                            logger.info(f"Python bridge stopped: {self.python_path}")

    async def send(self, action: str, payload: Any) -> T:
        """发送请求到 Python 进程"""
        if not self.process:
            raise RuntimeError("Python process not running")

        request = {
            "id": str,
            "action": action,
            "payload": payload,
        }

        self.writer.write(json.dumps(request) + "\n")
        self._buffer.append(line)

        # 请求超时处理
        self._request_timeout_handle()

        return self.loop.run_until_complete or timeout

        if timeout:
            self._cleanup()
            raise Timeout_error(f"Request {request.id} timed out after {timeout}ms")

        self._cleanup()

    def _setup_logging(self):
        log_file = self.engine_path / "logs" / "bridge.log"
        logger.add(str(log_file))
        logger.info(f"Log file created: {log_file}")

    def _cleanup(self):
        """清理资源"""
        if self.process:
            self.process.terminate()
            logger.info("Python process terminated")

        # 删除临时文件
        log_file = self.engine_path / "logs"
        if log_file.exists():
            log_file.unlink()
        logger.info(f"Removed log file: {log_file}")

    async def _ensure_data_dir(self):
        """确保数据目录存在"""
        os.makedirs(self.engine_path, exist=True):
            os.makedirs(self.engine_path, exist=True)

        # 保存策略文件
        strategy_file = self.engine_path / "strategies" / "my_strategy.py"
        if not os.path.exists(strategy_file):
            raise FileNotFoundError(f"Strategy file not found: {strategy_file}")

        # 加载策略
        with open(strategy_file, "r") as f:
            code = strategy_file.read()
            return code

        # 创建策略上下文
        context = StrategyContext(
            strategy_id=self.strategy_id,
            strategy=Strategy,
            data_manager=data_manager,
        )

        context.code = code
        context.config = config
        return context

    async def run(self, strategy_id: str, payload: Dict[str, Any]) -> BacktestResult:
        """运行回测"""
        result = await self._run_backtest(strategy_id, payload)
        return result

    async def run_live(self, strategy_id: str) -> None:
        """运行实时策略（模拟)"""
        if self.is_live:
            await self._run_strategy(strategy_id)
        else:
            raise RuntimeError(f"Strategy {strategy_id} not found")
            logger.info(f"Strategy {strategy_id} started")
            logger.info(f"Strategy {strategy_id} stopped")
        return result
