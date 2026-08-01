"use client";
import { useState, useEffect, createContext, useContext, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface Toast {
  id: string;
  type: "success" | "error" | "warning" | "info";
  title: string;
  message?: string;
  duration?: number;
}

interface ToastContextType {
  toast: (toast: Omit<Toast, "id">) => void;
  success: (title: string, message?: string) => void;
  error: (title: string, message?: string) => void;
  warning: (title: string, message?: string) => void;
  info: (title: string, message?: string) => void;
}

const ToastContext = createContext<ToastContextType | null>(null);

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    if (typeof window !== 'undefined') {
      // eslint-disable-next-line no-console
      console.warn('[useToast] ToastProvider 未包裹组件，toast 将不会显示');
    }
    return {
      toast: () => {},
      success: () => {},
      error: () => {},
      warning: () => {},
      info: () => {},
    };
  }
  return context;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const timersRef = useRef<Map<string, NodeJS.Timeout>>(new Map());

  // Cleanup timers on unmount
  useEffect(() => {
    const timers = timersRef.current;
    return () => {
      timers.forEach((timer) => clearTimeout(timer));
    };
  }, []);

  const addToast = useCallback((toast: Omit<Toast, "id">) => {
    const id = Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
    const duration = toast.duration || 3000;

    const newToast: Toast = { ...toast, id };
    setToasts((prev) => [...prev, newToast]);

    // Auto remove after duration
    const timer = setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
      timersRef.current.delete(id);
    }, duration);

    timersRef.current.set(id, timer);
  }, []);

  const contextValue: ToastContextType = {
    toast: addToast,
    success: (title, message) => addToast({ type: "success", title, message }),
    error: (title, message) => addToast({ type: "error", title, message }),
    warning: (title, message) => addToast({ type: "warning", title, message }),
    info: (title, message) => addToast({ type: "info", title, message }),
  };

  const removeToast = useCallback((id: string) => {
    const timer = timersRef.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timersRef.current.delete(id);
    }
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const typeStyles: Record<string, { bg: string; border: string; icon: string }> = {
    success: { bg: "bg-green-500/10", border: "border-green-500/30", icon: "✓" },
    error: { bg: "bg-red-500/10", border: "border-red-500/30", icon: "✕" },
    warning: { bg: "bg-yellow-500/10", border: "border-yellow-500/30", icon: "⚠" },
    info: { bg: "bg-blue-500/10", border: "border-blue-500/30", icon: "ℹ" },
  };

  return (
    <ToastContext.Provider value={contextValue}>
      {children}
      <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 max-w-sm">
        <AnimatePresence>
          {toasts.map((toast) => {
            const style = typeStyles[toast.type];
            return (
              <motion.div
                key={toast.id}
                initial={{ opacity: 0, x: 100, scale: 0.95 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: 100, scale: 0.95 }}
                transition={{ duration: 0.2 }}
                className={`${style.bg} ${style.border} border rounded-xl p-4 shadow-2xl backdrop-blur-sm cursor-pointer`}
                onClick={() => removeToast(toast.id)}
              >
                <div className="flex items-start gap-3">
                  <span className="text-lg">{style.icon}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white">{toast.title}</p>
                    {toast.message && (
                      <p className="text-xs text-text-secondary mt-1">{toast.message}</p>
                    )}
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      removeToast(toast.id);
                    }}
                    className="text-text-disabled hover:text-white"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M18 6L6 18M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}
