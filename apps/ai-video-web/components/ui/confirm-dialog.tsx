"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

interface ConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  variant?: "default" | "danger";
}

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmText = "确认",
  cancelText = "取消",
  variant = "default",
}: ConfirmDialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onClose]);

  // Prevent body scroll when open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={onClose}
      />

      {/* Dialog */}
      <div
        ref={dialogRef}
        className={cn(
          "relative z-10 w-full max-w-sm mx-4",
          "bg-panel-deep border border-divider rounded-2xl shadow-2xl",
          "animate-in fade-in zoom-in-95 slide-in-from-bottom-4 duration-200"
        )}
      >
        {/* Top accent line */}
        <div
          className={cn(
            "absolute top-0 left-1/2 -translate-x-1/2 w-12 h-0.5 rounded-b-full",
            variant === "danger"
              ? "bg-gradient-to-r from-transparent via-warm-orange to-transparent"
              : "bg-gradient-to-r from-transparent via-anime-purple to-transparent"
          )}
        />

        <div className="p-6 pt-7">
          {/* Icon */}
          <div className="flex justify-center mb-4">
            <div
              className={cn(
                "w-12 h-12 rounded-full flex items-center justify-center",
                variant === "danger"
                  ? "bg-warm-orange/10"
                  : "bg-anime-purple/10"
              )}
            >
              {variant === "danger" ? (
                <svg className="w-6 h-6 text-warm-orange" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                  <polyline points="16 17 21 12 16 7" />
                  <line x1="21" y1="12" x2="9" y2="12" />
                </svg>
              ) : (
                <svg className="w-6 h-6 text-anime-purple" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
              )}
            </div>
          </div>

          {/* Title */}
          <h3 className="text-center font-display text-lg font-semibold text-text-primary mb-2">
            {title}
          </h3>

          {/* Description */}
          {description && (
            <p className="text-center text-sm text-text-secondary leading-relaxed mb-6">
              {description}
            </p>
          )}

          {!description && <div className="mb-6" />}

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 h-10 rounded-lg text-sm font-medium text-text-secondary bg-panel-mid border border-divider hover:bg-edit-grey hover:text-text-primary transition-all"
            >
              {cancelText}
            </button>
            <button
              onClick={() => { onConfirm(); onClose(); }}
              className={cn(
                "flex-1 h-10 rounded-lg text-sm font-medium transition-all",
                variant === "danger"
                  ? "bg-warm-orange text-white hover:bg-[#E06B35] active:scale-[0.98]"
                  : "bg-anime-purple text-white hover:bg-[#8B6FFF] active:scale-[0.98]"
              )}
            >
              {confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
