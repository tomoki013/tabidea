import React from "react";
import { cn } from "@/lib/utils";

interface JournalInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const JournalInput = React.forwardRef<HTMLInputElement, JournalInputProps>(
  ({ className, label, error, ...props }, ref) => {
    return (
      <div className="space-y-1">
        {label && (
          <label className="text-sm font-hand font-bold text-stone-600 ml-1">
            {label}
          </label>
        )}
        <input
          ref={ref}
          className={cn(
            "flex h-12 w-full rounded-sm border-b-2 border-stone-300 bg-transparent px-3 py-2 text-lg font-hand placeholder:text-stone-400 focus-visible:outline-none focus-visible:border-primary disabled:cursor-not-allowed disabled:opacity-50 transition-colors",
            error && "border-destructive placeholder:text-destructive/50",
            className
          )}
          {...props}
        />
        {error && (
          <p className="text-xs font-hand text-destructive ml-1 mt-1">{error}</p>
        )}
      </div>
    );
  }
);

JournalInput.displayName = "JournalInput";
