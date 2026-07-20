"use client";
import { useEffect, ReactNode } from "react";
import { useSocketConnection } from "@/lib/websocket";

export function WebSocketProvider({ children }: { children: ReactNode }) {
  useSocketConnection();

  return <>{children}</>;
}
