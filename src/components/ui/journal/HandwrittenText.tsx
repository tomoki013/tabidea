import React from "react";
import { cn } from "@/lib/utils";

interface HandwrittenTextProps extends React.HTMLAttributes<HTMLParagraphElement> {
  children: React.ReactNode;
  tag?: "h1" | "h2" | "h3" | "h4" | "p" | "span";
  className?: string;
  wobble?: boolean;
}

export const HandwrittenText = ({ children, tag: Tag = "p", className, wobble = false, ...props }: HandwrittenTextProps) => {
  return (
    <Tag
      className={cn(
        "font-hand text-stone-800",
        wobble && "animate-[wobble_3s_ease-in-out_infinite]", // Ensure keyframe exists or remove
        className
      )}
      {...props}
    >
      {children}
    </Tag>
  );
};
