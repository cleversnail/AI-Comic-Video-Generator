import { cn } from "@/lib/utils";
import { InputHTMLAttributes, forwardRef } from "react";
const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(({ className, type, ...props }, ref) => (
  <input type={type} className={cn("flex h-10 w-full rounded-lg border border-divider bg-panel-mid px-3 py-2 text-sm text-text-primary","placeholder:text-text-disabled","focus-visible:outline-none focus-visible:border-anime-purple focus-visible:ring-1 focus-visible:ring-anime-purple/30","disabled:cursor-not-allowed disabled:opacity-50",className)} ref={ref} {...props}/>
));
Input.displayName="Input";
export { Input };
