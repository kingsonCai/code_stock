import { Server as HttpServer } from 'http';
import { EventEmitter } from 'events';
export declare class WebSocketServer extends EventEmitter {
    private wss;
    private clients;
    private heartbeatInterval;
    constructor(server: HttpServer);
    private setupHandlers;
    private handleMessage;
    private handleSubscribe;
    private handleUnsubscribe;
    private sendToClient;
    private startHeartbeat;
    /**
     * 向指定频道广播消息
     */
    broadcast<T>(channel: string, data: T): void;
    /**
     * 向指定用户发送消息
     */
    sendToUser<T>(userId: string, channel: string, data: T): void;
    /**
     * 获取客户端数量
     */
    getClientCount(): number;
    /**
     * 获取频道订阅数量
     */
    getChannelSubscribers(channel: string): number;
    /**
     * 关闭服务器
     */
    close(): void;
}
//# sourceMappingURL=index.d.ts.map