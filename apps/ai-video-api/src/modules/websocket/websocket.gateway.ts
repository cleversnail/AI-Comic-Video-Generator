import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger, UseGuards } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

@WebSocketGateway({
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  },
  namespace: '/',
})
export class TaskGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(TaskGateway.name);
  private userSockets = new Map<string, Set<string>>(); // userId -> Set<socketId>

  constructor(private readonly jwtService: JwtService) {}

  async handleConnection(client: Socket) {
    try {
      // 从 query 或 handshake 中获取 token
      const token = client.handshake.auth?.token || client.handshake.query?.token as string;

      if (!token) {
        this.logger.warn(`Client ${client.id} connected without token`);
        client.disconnect();
        return;
      }

      // 验证 JWT
      const payload = this.jwtService.verify(token);
      const userId = payload.sub || payload.id;

      if (!userId) {
        this.logger.warn(`Invalid token for client ${client.id}`);
        client.disconnect();
        return;
      }

      // 存储用户 socket 映射
      if (!this.userSockets.has(userId)) {
        this.userSockets.set(userId, new Set());
      }
      this.userSockets.get(userId)!.add(client.id);

      // 将 socket 加入用户专属房间
      client.join(`user:${userId}`);

      // 存储 userId 到 socket data
      client.data.userId = userId;

      this.logger.log(`Client ${client.id} connected for user ${userId}`);
    } catch (error) {
      this.logger.error(`Connection error: ${error.message}`);
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    const userId = client.data.userId;

    if (userId && this.userSockets.has(userId)) {
      this.userSockets.get(userId)!.delete(client.id);
      if (this.userSockets.get(userId)!.size === 0) {
        this.userSockets.delete(userId);
      }
    }

    this.logger.log(`Client ${client.id} disconnected`);
  }

  // 向特定用户的任务发送进度更新
  emitTaskProgress(userId: string, data: {
    taskId: string;
    projectId: string;
    status: string;
    progress?: number;
    resultUrl?: string;
    errorMessage?: string;
  }) {
    this.server.to(`user:${userId}`).emit('task:progress', data);
    this.logger.log(`Emitted task progress to user ${userId}: ${data.taskId} - ${data.status}`);
  }

  // 向特定用户发送通知
  emitNotification(userId: string, data: {
    type: 'info' | 'success' | 'warning' | 'error';
    title: string;
    message: string;
  }) {
    this.server.to(`user:${userId}`).emit('notification', data);
  }

  // 订阅项目更新
  @SubscribeMessage('subscribe:project')
  handleSubscribeProject(
    @ConnectedSocket() client: Socket,
    @MessageBody() projectId: string,
  ) {
    client.join(`project:${projectId}`);
    this.logger.log(`Client ${client.id} subscribed to project ${projectId}`);
    return { event: 'subscribed', data: { projectId } };
  }

  // 取消订阅项目更新
  @SubscribeMessage('unsubscribe:project')
  handleUnsubscribeProject(
    @ConnectedSocket() client: Socket,
    @MessageBody() projectId: string,
  ) {
    client.leave(`project:${projectId}`);
    this.logger.log(`Client ${client.id} unsubscribed from project ${projectId}`);
    return { event: 'unsubscribed', data: { projectId } };
  }

  // 获取在线用户数
  getOnlineUsersCount(): number {
    return this.userSockets.size;
  }

  // 检查用户是否在线
  isUserOnline(userId: string): boolean {
    return this.userSockets.has(userId) && this.userSockets.get(userId)!.size > 0;
  }
}
