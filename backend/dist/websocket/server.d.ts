/**
 * WebSocket 服务器共享实例
 * 避免循环依赖
 */
import { WebSocketServer } from './index.js';
import { TencentFinanceMarket } from './tencent.js';
import { OkxMarket } from './okx.js';
import { GateMarket } from './gate.js';
import { SpreadMonitor } from './spread-monitor.js';
export declare let wsServer: WebSocketServer | null;
export declare let tencentMarket: TencentFinanceMarket | null;
export declare let okxMarket: OkxMarket | null;
export declare let gateMarket: GateMarket | null;
export declare let spreadMonitor: SpreadMonitor | null;
export declare function setWsServer(server: WebSocketServer): void;
export declare function setTencentMarket(market: TencentFinanceMarket): void;
export declare function setOkxMarket(market: OkxMarket): void;
export declare function setGateMarket(market: GateMarket): void;
export declare function setSpreadMonitor(monitor: SpreadMonitor): void;
//# sourceMappingURL=server.d.ts.map