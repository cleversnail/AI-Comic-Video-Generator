"use client";
import { useEffect, useState, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useQueryClient } from '@tanstack/react-query';

const SOCKET_URL = process.env.NEXT_PUBLIC_WS_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

// WebSocket 单例（模块级，配合 StrictMode 通过 ref 在 Provider 中管理）
let socket: Socket | null = null;
let connectionCount = 0;

export function getSocket(): Socket | null {
  return socket;
}

export function connectSocket(token: string): Socket {
  if (socket?.connected) {
    connectionCount++;
    return socket;
  }

  socket = io(SOCKET_URL, {
    auth: { token },
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
  });

  connectionCount = 1;

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
  connectionCount--;
  if (connectionCount <= 0 && socket) {
    socket.disconnect();
    socket = null;
    connectionCount = 0;
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
  const callbackRef = useRef(onProgress);

  // 保持回调引用最新
  useEffect(() => {
    callbackRef.current = onProgress;
  }, [onProgress]);

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
      callbackRef.current?.(data);
    };

    socket.on('task:progress', handleTaskProgress);

    return () => {
      socket?.emit('unsubscribe:project', projectId);
      socket?.off('task:progress', handleTaskProgress);
    };
  }, [projectId, queryClient]);
}

// 通知 Hook
export interface Notification {
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message: string;
}

export function useNotifications(onNotification?: (data: Notification) => void) {
  const callbackRef = useRef(onNotification);

  useEffect(() => {
    callbackRef.current = onNotification;
  }, [onNotification]);

  useEffect(() => {
    if (!socket) return;

    const handleNotification = (data: Notification) => {
      console.log('Notification:', data);
      callbackRef.current?.(data);
    };

    socket.on('notification', handleNotification);

    return () => {
      socket?.off('notification', handleNotification);
    };
  }, []);
}

// 自动连接 Hook（登录后自动建立连接）
export function useSocketConnection() {
  const [isConnected, setIsConnected] = useState(false);
  const [token, setToken] = useState<string | null>(null);

  // 监听 token 变化（登录/登出）
  useEffect(() => {
    const readToken = () => setToken(localStorage.getItem('accessToken'));
    readToken();

    // 监听 storage 事件（跨 tab）和自定义事件（同 tab 登录）
    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'accessToken') readToken();
    };
    const handleAuthChange = () => readToken();

    window.addEventListener('storage', handleStorage);
    window.addEventListener('auth-changed', handleAuthChange);
    return () => {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('auth-changed', handleAuthChange);
    };
  }, []);

  // token 变化时自动连接/断开
  useEffect(() => {
    if (!token) {
      // 无 token 时断开现有连接
      if (socket) {
        disconnectSocket();
        setIsConnected(false);
      }
      return;
    }

    // 已有连接且 token 相同，跳过
    if (socket?.connected) {
      setIsConnected(true);
      return;
    }

    const s = connectSocket(token);

    const handleConnect = () => setIsConnected(true);
    const handleDisconnect = () => setIsConnected(false);

    s.on('connect', handleConnect);
    s.on('disconnect', handleDisconnect);

    if (s.connected) {
      setIsConnected(true);
    }

    return () => {
      s.off('connect', handleConnect);
      s.off('disconnect', handleDisconnect);
    };
  }, [token]);

  return { isConnected, socket: getSocket() };
}
