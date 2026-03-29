/**
 * WebSocket 服务器
 */
import WebSocket, { WebSocketServer as WSServer } from 'ws';
import { Server as HttpServer } from 'http';
import { EventEmitter } from 'events';
import { verifyToken, JwtPayload } from '../middleware/auth.js';
import { logger } from '../config/logger.js';
import { ClientMessage, ServerMessage } from './types.js';

interface ClientInfo {
  ws: WebSocket;
  userId?: string;
  channels: Set<string>;
  isAlive: boolean;
}

export class WebSocketServer extends EventEmitter {
  private wss: WSServer;
  private clients: Map<WebSocket, ClientInfo> = new Map();
  private heartbeatInterval: NodeJS.Timeout | null = null;

  constructor(server: HttpServer) {
    super();
    this.wss = new WSServer({ server, path: '/ws' });
    this.setupHandlers();
    this.startHeartbeat();
  }

  private setupHandlers(): void {
    this.wss.on('connection', (ws, req) => {
      const clientInfo: ClientInfo = {
        ws,
        channels: new Set(),
        isAlive: true,
      };

      // 从 URL 参数获取 token
      const url = new URL(req.url || '', `http://${req.headers.host}`);
      const token = url.searchParams.get('token');

      if (token) {
        const payload = verifyToken(token);
        if (payload) {
          clientInfo.userId = payload.userId;
        }
      }

      this.clients.set(ws, clientInfo);
      logger.info(`WebSocket client connected. Total: ${this.clients.size}`);

      // 发送连接成功消息
      this.sendToClient(ws, {
        type: 'connected',
        channel: 'system',
        data: { message: 'Connected successfully' },
        timestamp: Date.now(),
      });

      ws.on('message', (data) => {
        try {
          const message: ClientMessage = JSON.parse(data.toString());
          this.handleMessage(ws, message);
        } catch (error) {
          logger.error('Failed to parse WebSocket message:', error);
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
        logger.info(`WebSocket client disconnected. Total: ${this.clients.size}`);
      });

      ws.on('pong', () => {
        const client = this.clients.get(ws);
        if (client) {
          client.isAlive = true;
        }
      });
    });
  }

  private handleMessage(ws: WebSocket, message: ClientMessage): void {
    const client = this.clients.get(ws);
    if (!client) return;

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
          error: `Unknown message type: ${(message as any).type}`,
          timestamp: Date.now(),
        });
    }
  }

  private handleSubscribe(ws: WebSocket, channel: string, client: ClientInfo): void {
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

    logger.debug(`Client subscribed to ${channel}`);
  }

  private handleUnsubscribe(ws: WebSocket, channel: string, client: ClientInfo): void {
    client.channels.delete(channel);
    this.sendToClient(ws, {
      type: 'unsubscribed',
      channel,
      data: { channel },
      timestamp: Date.now(),
    });

    logger.debug(`Client unsubscribed from ${channel}`);
  }

  private sendToClient(ws: WebSocket, message: ServerMessage): void {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
    }
  }

  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      this.clients.forEach((client, ws) => {
        if (!client.isAlive) {
          logger.warn('Terminating inactive WebSocket client');
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
  broadcast<T>(channel: string, data: T): void {
    const message: ServerMessage<T> = {
      type: 'data',
      channel,
      data,
      timestamp: Date.now(),
    };

    const messageStr = JSON.stringify(message);
    let recipientCount = 0;

    this.clients.forEach((client, ws) => {
      if (client.channels.has(channel) && ws.readyState === WebSocket.OPEN) {
        ws.send(messageStr);
        recipientCount++;
      }
    });

    logger.debug(`Broadcast to ${recipientCount} clients on channel ${channel}`);
  }

  /**
   * 向指定用户发送消息
   */
  sendToUser<T>(userId: string, channel: string, data: T): void {
    const message: ServerMessage<T> = {
      type: 'data',
      channel,
      data,
      timestamp: Date.now(),
    };

    const messageStr = JSON.stringify(message);

    this.clients.forEach((client, ws) => {
      if (
        client.userId === userId &&
        client.channels.has(channel) &&
        ws.readyState === WebSocket.OPEN
      ) {
        ws.send(messageStr);
      }
    });
  }

  /**
   * 获取客户端数量
   */
  getClientCount(): number {
    return this.clients.size;
  }

  /**
   * 获取频道订阅数量
   */
  getChannelSubscribers(channel: string): number {
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
  close(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }
    this.wss.close();
  }
}
