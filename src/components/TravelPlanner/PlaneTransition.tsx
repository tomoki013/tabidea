"use client";

import { FaPlane } from "react-icons/fa";

export default function PlaneTransition() {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
      {/* Backdrop: Fades in/out to obscure the previous screen */}
      <div className="absolute inset-0 bg-[#fcfbf9]/90 backdrop-blur-sm animate-in fade-in duration-300" />

      {/* Plane Animation Container */}
      <div
        className="text-primary absolute z-10"
        style={{
          animation: "fly-across 0.8s cubic-bezier(0.45, 0.05, 0.55, 0.95) forwards",
          left: 0,
          bottom: 0,
        }}
      >
        <FaPlane size={80} />
      </div>
    </div>
  );
}
