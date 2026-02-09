import React from "react";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

interface JournalButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "ghost";
  size?: "sm" | "md" | "lg";
  isLoading?: boolean;
}

export const JournalButton = React.forwardRef<HTMLButtonElement, JournalButtonProps>(
  ({ className, variant = "primary", size = "md", isLoading, children, ...props }, ref) => {
    const baseStyles = "inline-flex items-center justify-center font-hand transition-all focus-visible:outline-none disabled:opacity-50 disabled:pointer-events-none active:scale-95";

    const variants = {
      primary: "bg-primary text-primary-foreground shadow-md hover:bg-primary/90 rounded-sm border-2 border-primary-foreground/20 hover:-rotate-1",
      secondary: "bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary/80 rounded-sm border-2 border-white/20 hover:rotate-1",
      outline: "border-2 border-stone-300 bg-transparent hover:bg-stone-100 text-stone-600 rounded-sm hover:-rotate-1 border-dashed",
      ghost: "hover:bg-stone-100 text-stone-600 hover:text-stone-900",
    };

    const sizes = {
      sm: "h-9 px-3 text-sm",
      md: "h-11 px-6 text-base",
      lg: "h-14 px-8 text-lg",
    };

    return (
      <button
        ref={ref}
        className={cn(baseStyles, variants[variant], sizes[size], className)}
        disabled={isLoading || props.disabled}
        {...props}
      >
        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        {children}
      </button>
    );
  }
);

JournalButton.displayName = "JournalButton";
