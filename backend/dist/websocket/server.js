"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.spreadMonitor = exports.gateMarket = exports.okxMarket = exports.tencentMarket = exports.marketSimulator = exports.wsServer = void 0;
exports.setWsServer = setWsServer;
exports.setMarketSimulator = setMarketSimulator;
exports.setTencentMarket = setTencentMarket;
exports.setOkxMarket = setOkxMarket;
exports.setGateMarket = setGateMarket;
exports.setSpreadMonitor = setSpreadMonitor;
// 全局实例引用
exports.wsServer = null;
exports.marketSimulator = null;
exports.tencentMarket = null;
exports.okxMarket = null;
exports.gateMarket = null;
exports.spreadMonitor = null;
function setWsServer(server) {
    exports.wsServer = server;
}
function setMarketSimulator(simulator) {
    exports.marketSimulator = simulator;
}
function setTencentMarket(market) {
    exports.tencentMarket = market;
}
function setOkxMarket(market) {
    exports.okxMarket = market;
}
function setGateMarket(market) {
    exports.gateMarket = market;
}
function setSpreadMonitor(monitor) {
    exports.spreadMonitor = monitor;
}
//# sourceMappingURL=server.js.map