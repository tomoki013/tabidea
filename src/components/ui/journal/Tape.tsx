import React from "react";
import { cn } from "@/lib/utils";

interface TapeProps extends React.HTMLAttributes<HTMLDivElement> {
  color?: "yellow" | "pink" | "blue" | "green" | "white" | "red";
  position?: "top-left" | "top-right" | "bottom-left" | "bottom-right" | "top-center";
  rotation?: "left" | "right" | "straight";
  className?: string;
}

export const Tape = ({ color = "yellow", position = "top-center", rotation = "left", className, ...props }: TapeProps) => {
  const colors = {
    yellow: "bg-yellow-100/80 border-yellow-200/50",
    pink: "bg-pink-100/80 border-pink-200/50",
    blue: "bg-blue-100/80 border-blue-200/50",
    green: "bg-green-100/80 border-green-200/50",
    white: "bg-white/80 border-stone-200/50",
    red: "bg-red-100/80 border-red-200/50",
  };

  const positions = {
    "top-left": "-top-3 -left-3",
    "top-right": "-top-3 -right-3",
    "bottom-left": "-bottom-3 -left-3",
    "bottom-right": "-bottom-3 -right-3",
    "top-center": "-top-4 left-1/2 -translate-x-1/2",
  };

  const rotations = {
    left: "-rotate-3",
    right: "rotate-3",
    straight: "rotate-0",
  };

  return (
    <div
      className={cn(
        "absolute w-24 h-8 shadow-sm backdrop-blur-[1px] z-20 pointer-events-none",
        "before:content-[''] before:absolute before:left-[-2px] before:top-0 before:bottom-0 before:w-[4px] before:bg-inherit before:[clip-path:polygon(0%_0%,100%_10%,0%_20%,100%_30%,0%_40%,100%_50%,0%_60%,100%_70%,0%_80%,100%_90%,0%_100%)]",
        "after:content-[''] after:absolute after:right-[-2px] after:top-0 after:bottom-0 after:w-[4px] after:bg-inherit after:[clip-path:polygon(100%_0%,0%_10%,100%_20%,0%_30%,100%_40%,0%_50%,100%_60%,0%_70%,100%_80%,0%_90%,100%_100%)]",
        colors[color],
        positions[position],
        rotations[rotation],
        className
      )}
      {...props}
    />
  );
};
