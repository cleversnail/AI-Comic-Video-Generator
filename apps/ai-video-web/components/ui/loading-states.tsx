"use client";
import { Button } from "./button";
import { AlertIcon, ImageIcon, FilmIcon } from "../icons";

// Loading Spinner
export function LoadingSpinner({ size = "md", className = "" }: { size?: "sm" | "md" | "lg"; className?: string }) {
  const sizeClasses = {
    sm: "w-4 h-4",
    md: "w-8 h-8",
    lg: "w-12 h-12",
  };
  return (
    <div className={`${sizeClasses[size]} rounded-full border-2 border-anime-purple border-t-transparent animate-spin ${className}`} />
  );
}

// Loading State Component
export function LoadingState({
  message = "加载中...",
  className = "",
}: {
  message?: string;
  className?: string;
}) {
  return (
    <div className={`flex flex-col items-center justify-center py-12 ${className}`}>
      <LoadingSpinner size="lg" />
      <p className="text-text-secondary text-sm mt-4">{message}</p>
    </div>
  );
}

// Skeleton Loader
export function Skeleton({ className }: { className?: string }) {
  return (
    <div className={`bg-panel-mid rounded-lg animate-pulse ${className}`} />
  );
}

// Card Skeleton
export function CardSkeleton() {
  return (
    <div className="rounded-xl bg-panel-deep border border-divider p-4">
      <Skeleton className="h-4 w-3/4 mb-3" />
      <Skeleton className="h-3 w-1/2 mb-2" />
      <Skeleton className="h-3 w-2/3" />
    </div>
  );
}

// List Skeleton
export function ListSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <CardSkeleton key={i} />
      ))}
    </div>
  );
}

// Empty State Component
export function EmptyState({
  icon: Icon = ImageIcon,
  title = "暂无数据",
  description,
  action,
  className = "",
}: {
  icon?: React.ComponentType<{ className?: string }>;
  title?: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}) {
  return (
    <div className={`flex flex-col items-center justify-center py-12 ${className}`}>
      <div className="w-16 h-16 rounded-full bg-panel-mid flex items-center justify-center mb-4">
        <Icon className="w-8 h-8 text-text-disabled" />
      </div>
      <h3 className="font-display text-lg font-semibold text-white mb-2">{title}</h3>
      {description && (
        <p className="text-text-secondary text-sm mb-6 text-center max-w-md">{description}</p>
      )}
      {action && (
        <Button onClick={action.onClick}>{action.label}</Button>
      )}
    </div>
  );
}

// Error State Component
export function ErrorState({
  title = "出错了",
  message = "发生了一个意外错误",
  onRetry,
  className = "",
}: {
  title?: string;
  message?: string;
  onRetry?: () => void;
  className?: string;
}) {
  return (
    <div className={`flex flex-col items-center justify-center py-12 ${className}`}>
      <div className="w-16 h-16 rounded-full bg-warm-orange/10 flex items-center justify-center mb-4">
        <AlertIcon className="w-8 h-8 text-warm-orange" />
      </div>
      <h3 className="font-display text-lg font-semibold text-white mb-2">{title}</h3>
      <p className="text-text-secondary text-sm mb-6 text-center max-w-md">{message}</p>
      {onRetry && (
        <Button variant="outline" onClick={onRetry}>
          重试
        </Button>
      )}
    </div>
  );
}

// Query State Wrapper - handles loading, error, empty states
export function QueryState({
  isLoading,
  error,
  isEmpty,
  emptyIcon,
  emptyTitle,
  emptyDescription,
  emptyAction,
  children,
}: {
  isLoading?: boolean;
  error?: Error | null;
  isEmpty?: boolean;
  emptyIcon?: React.ComponentType<{ className?: string }>;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyAction?: { label: string; onClick: () => void };
  children: React.ReactNode;
}) {
  if (isLoading) {
    return <LoadingState />;
  }

  if (error) {
    return (
      <ErrorState
        message={error.message || "加载失败，请重试"}
        onRetry={() => window.location.reload()}
      />
    );
  }

  if (isEmpty) {
    return (
      <EmptyState
        icon={emptyIcon}
        title={emptyTitle}
        description={emptyDescription}
        action={emptyAction}
      />
    );
  }

  return <>{children}</>;
}
