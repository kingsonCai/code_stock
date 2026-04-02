/**
 * Koa 应用入口
 */
import Koa from 'koa';
import { Server as HttpServer } from 'http';
import { WebSocketServer } from './websocket/index.js';
export declare function createApp(): Koa;
declare function start(): Promise<{
    server: HttpServer<typeof import("http").IncomingMessage, typeof import("http").ServerResponse>;
    wsServer: WebSocketServer | null;
}>;
export { start };
//# sourceMappingURL=app.d.ts.map