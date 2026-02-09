import React from "react";
import { cn } from "@/lib/utils";

interface JournalSheetProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  variant?: "default" | "torn" | "notebook";
  className?: string;
}

export const JournalSheet = React.forwardRef<HTMLDivElement, JournalSheetProps>(
  ({ children, variant = "default", className, ...props }, ref) => {
    const baseStyles = "bg-[#fcfbf9] relative shadow-md border border-stone-200";

    const variants = {
      default: "rounded-sm p-6",
      torn: "rounded-sm p-6 [clip-path:polygon(0%_0%,100%_0%,100%_calc(100%-10px),98%_100%,95%_calc(100%-5px),92%_100%,88%_calc(100%-8px),85%_100%,80%_calc(100%-4px),75%_100%,70%_calc(100%-6px),65%_100%,60%_calc(100%-3px),55%_100%,50%_calc(100%-7px),45%_100%,40%_calc(100%-4px),35%_100%,30%_calc(100%-6px),25%_100%,20%_calc(100%-3px),15%_100%,10%_calc(100%-7px),5%_100%,0%_calc(100%-5px))]",
      notebook: "rounded-r-md rounded-l-sm border-l-4 border-l-stone-300 p-6 bg-[linear-gradient(to_bottom,#e5e7eb_1px,transparent_1px)] bg-[size:100%_2rem]",
    };

    return (
      <div
        ref={ref}
        className={cn(baseStyles, variants[variant], className)}
        {...props}
      >
        {/* Paper texture overlay (subtle noise) */}
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/cream-paper.png')]" />

        <div className="relative z-10 h-full w-full">
          {children}
        </div>
      </div>
    );
  }
);

JournalSheet.displayName = "JournalSheet";
