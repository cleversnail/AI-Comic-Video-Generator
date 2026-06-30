import { cn } from "@/lib/utils";
import { HTMLAttributes } from "react";
interface BadgeProps extends HTMLAttributes<HTMLSpanElement> { variant?: "default"|"success"|"warning"|"error"|"info"; }
export function Badge({ className, variant="default", ...props }: BadgeProps) {
  return <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",{"bg-anime-purple/10 text-anime-purple":variant==="default","bg-neon-cyan/10 text-neon-cyan":variant==="success","bg-warm-orange/10 text-warm-orange":variant==="warning","bg-red-500/10 text-red-400":variant==="error","bg-panel-mid text-text-secondary":variant==="info"},className)} {...props}/>;
}
