import React from "react";
import Link from "next/link";
import { FaPlane } from "react-icons/fa";

export default function FloatingLink() {
  return (
    <div className="fixed bottom-6 right-6 z-50 animate-bounce hover:animate-none">
      <Link
        href="https://travel.tomokichidiary.com"
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-2 bg-gradient-to-r from-blue-500 to-teal-400 text-white px-4 py-3 rounded-full shadow-lg hover:shadow-xl transition-all hover:scale-105 group"
      >
        <FaPlane className="text-xl group-hover:rotate-45 transition-transform" />
        <span className="font-bold text-sm hidden sm:inline">ともきちの旅行日記</span>
      </Link>
    </div>
  );
}
