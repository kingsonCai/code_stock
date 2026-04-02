"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.WebSocketServer = void 0;
/**
 * WebSocket 服务器
 */
const ws_1 = __importStar(require("ws"));
const events_1 = require("events");
const auth_js_1 = require("../middleware/auth.js");
const logger_js_1 = require("../config/logger.js");
class WebSocketServer extends events_1.EventEmitter {
    wss;
    clients = new Map();
    heartbeatInterval = null;
    constructor(server) {
        super();
        this.wss = new ws_1.WebSocketServer({ server, path: '/ws' });
        this.setupHandlers();
        this.startHeartbeat();
    }
    setupHandlers() {
        this.wss.on('connection', (ws, req) => {
            const clientInfo = {
                ws,
                channels: new Set(),
                isAlive: true,
            };
            // 从 URL 参数获取 token
            const url = new URL(req.url || '', `http://${req.headers.host}`);
            const token = url.searchParams.get('token');
            if (token) {
                const payload = (0, auth_js_1.verifyToken)(token);
                if (payload) {
                    clientInfo.userId = payload.userId;
                }
            }
            this.clients.set(ws, clientInfo);
            logger_js_1.logger.info(`WebSocket client connected. Total: ${this.clients.size}`);
            // 发送连接成功消息
            this.sendToClient(ws, {
                type: 'connected',
                channel: 'system',
                data: { message: 'Connected successfully' },
                timestamp: Date.now(),
            });
            ws.on('message', (data) => {
                try {
                    const message = JSON.parse(data.toString());
                    this.handleMessage(ws, message);
                }
                catch (error) {
                    logger_js_1.logger.error('Failed to parse WebSocket message:', error);
                    this.sendToClient(ws, {
                        type: 'error',
                        channel: 'system',
                        error: 'Invalid message format',
                        timestamp: Date.now(),
                    });
                }
            });
            ws.on('close', () => {
                this.clients.delete(ws);
                logger_js_1.logger.info(`WebSocket client disconnected. Total: ${this.clients.size}`);
            });
            ws.on('pong', () => {
                const client = this.clients.get(ws);
                if (client) {
                    client.isAlive = true;
                }
            });
        });
    }
    handleMessage(ws, message) {
        const client = this.clients.get(ws);
        if (!client)
            return;
        switch (message.type) {
            case 'subscribe':
                this.handleSubscribe(ws, message.channel, client);
                break;
            case 'unsubscribe':
                this.handleUnsubscribe(ws, message.channel, client);
                break;
            case 'ping':
                this.sendToClient(ws, {
                    type: 'pong',
                    channel: 'system',
                    timestamp: Date.now(),
                });
                break;
            default:
                this.sendToClient(ws, {
                    type: 'error',
                    channel: 'system',
                    error: `Unknown message type: ${message.type}`,
                    timestamp: Date.now(),
                });
        }
    }
    handleSubscribe(ws, channel, client) {
        // 检查权限
        const [type, ...parts] = channel.split(':');
        switch (type) {
            case 'market':
                // 公开频道，无需认证
                break;
            case 'backtest':
            case 'strategy':
            case 'account':
                // 需要认证
                if (!client.userId) {
                    this.sendToClient(ws, {
                        type: 'error',
                        channel,
                        error: 'Authentication required',
                        timestamp: Date.now(),
                    });
                    return;
                }
                break;
            default:
                this.sendToClient(ws, {
                    type: 'error',
                    channel,
                    error: `Unknown channel type: ${type}`,
                    timestamp: Date.now(),
                });
                return;
        }
        client.channels.add(channel);
        this.sendToClient(ws, {
            type: 'subscribed',
            channel,
            data: { channel },
            timestamp: Date.now(),
        });
        logger_js_1.logger.debug(`Client subscribed to ${channel}`);
    }
    handleUnsubscribe(ws, channel, client) {
        client.channels.delete(channel);
        this.sendToClient(ws, {
            type: 'unsubscribed',
            channel,
            data: { channel },
            timestamp: Date.now(),
        });
        logger_js_1.logger.debug(`Client unsubscribed from ${channel}`);
    }
    sendToClient(ws, message) {
        if (ws.readyState === ws_1.default.OPEN) {
            ws.send(JSON.stringify(message));
        }
    }
    startHeartbeat() {
        this.heartbeatInterval = setInterval(() => {
            this.clients.forEach((client, ws) => {
                if (!client.isAlive) {
                    logger_js_1.logger.warn('Terminating inactive WebSocket client');
                    ws.terminate();
                    this.clients.delete(ws);
                    return;
                }
                client.isAlive = false;
                ws.ping();
            });
        }, 30000); // 30秒心跳
    }
    /**
     * 向指定频道广播消息
     */
    broadcast(channel, data) {
        const message = {
            type: 'data',
            channel,
            data,
            timestamp: Date.now(),
        };
        const messageStr = JSON.stringify(message);
        let recipientCount = 0;
        this.clients.forEach((client, ws) => {
            if (client.channels.has(channel) && ws.readyState === ws_1.default.OPEN) {
                ws.send(messageStr);
                recipientCount++;
            }
        });
        logger_js_1.logger.debug(`Broadcast to ${recipientCount} clients on channel ${channel}`);
    }
    /**
     * 向指定用户发送消息
     */
    sendToUser(userId, channel, data) {
        const message = {
            type: 'data',
            channel,
            data,
            timestamp: Date.now(),
        };
        const messageStr = JSON.stringify(message);
        this.clients.forEach((client, ws) => {
            if (client.userId === userId &&
                client.channels.has(channel) &&
                ws.readyState === ws_1.default.OPEN) {
                ws.send(messageStr);
            }
        });
    }
    /**
     * 获取客户端数量
     */
    getClientCount() {
        return this.clients.size;
    }
    /**
     * 获取频道订阅数量
     */
    getChannelSubscribers(channel) {
        let count = 0;
        this.clients.forEach((client) => {
            if (client.channels.has(channel)) {
                count++;
            }
        });
        return count;
    }
    /**
     * 关闭服务器
     */
    close() {
        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
        }
        this.wss.close();
    }
}
exports.WebSocketServer = WebSocketServer;
//# sourceMappingURL=index.js.map