import React from "react";
import { cn } from "@/lib/utils";

interface StampProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  color?: "red" | "blue" | "black" | "green";
  rotation?: "left" | "right" | "random";
  size?: "sm" | "md" | "lg";
  className?: string;
}

export const Stamp = ({ children, color = "red", rotation = "random", size = "md", className, ...props }: StampProps) => {
  const colors = {
    red: "text-red-700 border-red-700/80",
    blue: "text-blue-800 border-blue-800/80",
    black: "text-stone-800 border-stone-800/80",
    green: "text-green-800 border-green-800/80",
  };

  const sizes = {
    sm: "w-16 h-16 text-xs border-2",
    md: "w-24 h-24 text-sm border-4",
    lg: "w-32 h-32 text-base border-4",
  };

  // Determine rotation style
  let rotateClass = "";
  if (rotation === "left") rotateClass = "-rotate-12";
  else if (rotation === "right") rotateClass = "rotate-12";
  else rotateClass = Math.random() > 0.5 ? "rotate-6" : "-rotate-6"; // Simple random for initial render, usually better to be deterministic or controlled prop

  return (
    <div
      className={cn(
        "rounded-full flex items-center justify-center font-bold uppercase tracking-widest opacity-80 mix-blend-multiply select-none",
        "border-dashed",
        colors[color],
        sizes[size],
        rotateClass,
        className
      )}
      {...props}
    >
      <div className="text-center transform rotate-0">
        {children}
      </div>
    </div>
  );
};
