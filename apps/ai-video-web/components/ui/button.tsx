import { cn } from "@/lib/utils";
import { ButtonHTMLAttributes, forwardRef } from "react";
interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> { variant?: "primary"|"secondary"|"ghost"|"outline"|"danger"; size?: "sm"|"md"|"lg"; isLoading?: boolean; }
const Button = forwardRef<HTMLButtonElement, ButtonProps>(({ className, variant="primary", size="md", isLoading, children, disabled, ...props }, ref) => (
  <button ref={ref} disabled={disabled||isLoading} className={cn("inline-flex items-center justify-center rounded-lg font-medium transition-all duration-200","focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-anime-purple focus-visible:ring-offset-2 focus-visible:ring-offset-cinema","disabled:opacity-50 disabled:cursor-not-allowed",{"bg-anime-purple text-white hover:bg-[#8B6FFF] hover:shadow-[0_0_24px_rgba(124,92,255,0.35)] active:scale-[0.98]":variant==="primary","bg-panel-mid text-text-primary hover:bg-edit-grey border border-divider":variant==="secondary","bg-transparent text-text-secondary hover:text-text-primary hover:bg-panel-mid":variant==="ghost","bg-transparent border border-divider text-text-primary hover:border-anime-purple hover:text-anime-purple":variant==="outline","bg-warm-orange/10 text-warm-orange border border-warm-orange/30 hover:bg-warm-orange/20":variant==="danger","h-8 px-3 text-sm":size==="sm","h-10 px-4 text-sm":size==="md","h-12 px-6 text-base":size==="lg"},className)} {...props}>
    {isLoading&&<svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>}{children}
  </button>
));
Button.displayName="Button";
export { Button };
