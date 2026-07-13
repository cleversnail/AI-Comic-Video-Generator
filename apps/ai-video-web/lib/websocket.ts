"use client";
import { useEffect, useRef, useCallback, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useQueryClient } from '@tanstack/react-query';

const SOCKET_URL = process.env.NEXT_PUBLIC_WS_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

// WebSocket 单例
let socket: Socket | null = null;

export function getSocket(): Socket | null {
  return socket;
}

export function connectSocket(token: string): Socket {
  if (socket?.connected) {
    return socket;
  }

  socket = io(SOCKET_URL, {
    auth: { token },
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
  });

  socket.on('connect', () => {
    console.log('WebSocket connected');
  });

  socket.on('disconnect', (reason) => {
    console.log('WebSocket disconnected:', reason);
  });

  socket.on('connect_error', (error) => {
    console.error('WebSocket connection error:', error.message);
  });

  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

// 任务进度 Hook
export interface TaskProgress {
  taskId: string;
  projectId: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  progress?: number;
  resultUrl?: string;
  errorMessage?: string;
}

export function useTaskProgress(projectId: string | undefined, onProgress?: (data: TaskProgress) => void) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!socket || !projectId) return;

    // 订阅项目更新
    socket.emit('subscribe:project', projectId);

    // 监听任务进度
    const handleTaskProgress = (data: TaskProgress) => {
      console.log('Task progress:', data);

      // 更新 React Query 缓存
      queryClient.invalidateQueries({ queryKey: ['generation-tasks', projectId] });

      // 调用回调
      onProgress?.(data);
    };

    socket.on('task:progress', handleTaskProgress);

    return () => {
      socket?.emit('unsubscribe:project', projectId);
      socket?.off('task:progress', handleTaskProgress);
    };
  }, [socket, projectId, queryClient, onProgress]);
}

// 通知 Hook
export interface Notification {
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message: string;
}

export function useNotifications(onNotification?: (data: Notification) => void) {
  useEffect(() => {
    if (!socket) return;

    const handleNotification = (data: Notification) => {
      console.log('Notification:', data);
      onNotification?.(data);
    };

    socket.on('notification', handleNotification);

    return () => {
      socket?.off('notification', handleNotification);
    };
  }, [socket, onNotification]);
}

// 自动连接 Hook
export function useSocketConnection() {
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('accessToken');

    if (token && !socket) {
      const s = connectSocket(token);

      s.on('connect', () => setIsConnected(true));
      s.on('disconnect', () => setIsConnected(false));

      if (s.connected) {
        setIsConnected(true);
      }
    }

    return () => {
      // 不在组件卸载时断开连接，保持全局连接
    };
  }, []);

  return { isConnected, socket: getSocket() };
}
