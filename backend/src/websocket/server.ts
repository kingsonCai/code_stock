/**
 * WebSocket 服务器共享实例
 * 避免循环依赖
 */
import { WebSocketServer } from './index.js';
import { TencentFinanceMarket } from './tencent.js';
import { OkxMarket } from './okx.js';
import { GateMarket } from './gate.js';
import { SpreadMonitor } from './spread-monitor.js';

// 全局实例引用
export let wsServer: WebSocketServer | null = null;
export let tencentMarket: TencentFinanceMarket | null = null;
export let okxMarket: OkxMarket | null = null;
export let gateMarket: GateMarket | null = null;
export let spreadMonitor: SpreadMonitor | null = null;

export function setWsServer(server: WebSocketServer): void {
  wsServer = server;
}

export function setTencentMarket(market: TencentFinanceMarket): void {
  tencentMarket = market;
}

export function setOkxMarket(market: OkxMarket): void {
  okxMarket = market;
}

export function setGateMarket(market: GateMarket): void {
  gateMarket = market;
}

export function setSpreadMonitor(monitor: SpreadMonitor): void {
  spreadMonitor = monitor;
}
