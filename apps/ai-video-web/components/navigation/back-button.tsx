"use client";

import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

interface BackButtonProps {
  className?: string;
  label?: string;
  href?: string;
}

export function BackButton({ className, label = "返回", href }: BackButtonProps) {
  const router = useRouter();

  return (
    <button
      onClick={() => {
        if (href) {
          router.push(href);
        } else {
          router.back();
        }
      }}
      className={cn(
        "group inline-flex items-center gap-1.5 text-sm font-medium transition-all duration-200",
        "text-text-secondary hover:text-anime-purple",
        className,
      )}
    >
      <svg
        className="w-4 h-4 transition-transform duration-200 group-hover:-translate-x-0.5"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="m15 18-6-6 6-6" />
      </svg>
      <span>{label}</span>
    </button>
  );
}
