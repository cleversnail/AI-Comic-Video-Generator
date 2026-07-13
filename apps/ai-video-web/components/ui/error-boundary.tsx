"use client";
import React, { Component, ErrorInfo, ReactNode } from "react";
import { Button } from "./button";
import { AlertIcon } from "../icons";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
    this.props.onError?.(error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex flex-col items-center justify-center min-h-[200px] p-8">
          <div className="w-16 h-16 rounded-full bg-warm-orange/10 flex items-center justify-center mb-4">
            <AlertIcon className="w-8 h-8 text-warm-orange" />
          </div>
          <h2 className="font-display text-xl font-semibold text-white mb-2">
            出错了
          </h2>
          <p className="text-text-secondary text-sm mb-6 text-center max-w-md">
            {this.state.error?.message || "发生了一个意外错误，请刷新页面重试"}
          </p>
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => this.setState({ hasError: false, error: undefined })}
            >
              重试
            </Button>
            <Button onClick={() => window.location.reload()}>
              刷新页面
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Hook version for functional components
export function useErrorHandler() {
  return (error: Error, errorInfo?: ErrorInfo) => {
    console.error("Error caught by error handler:", error, errorInfo);
    // You can add error reporting service here
  };
}
