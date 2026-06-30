import { cn } from "@/lib/utils";
import { TextareaHTMLAttributes, forwardRef } from "react";
const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(({ className, ...props }, ref) => (
  <textarea className={cn("flex min-h-[80px] w-full rounded-lg border border-divider bg-panel-mid px-3 py-2 text-sm text-text-primary","placeholder:text-text-disabled","focus-visible:outline-none focus-visible:border-anime-purple focus-visible:ring-1 focus-visible:ring-anime-purple/30","disabled:cursor-not-allowed disabled:opacity-50",className)} ref={ref} {...props}/>
));
Textarea.displayName="Textarea";
export { Textarea };
