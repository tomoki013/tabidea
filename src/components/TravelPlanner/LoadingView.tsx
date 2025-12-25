"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

// Reusing images for consistent theme
const loadingImages = [
  "/images/eiffel-tower-and-sunset.jpg",
  "/images/kiyomizu-temple-autumn-leaves-lightup.jpg",
  "/images/balloons-in-cappadocia.jpg",
  "/images/tajmahal.jpg",
];

const loadingMessages = [
  "ともきち日記のアーカイブにアクセス中...",
  "関連するブログ記事を検索中...",
  "体験談を抽出中...",
  "抽出情報をAIが分析中...",
  "あなただけの旅程を作成中...",
];

export default function LoadingView() {
  const [step, setStep] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setStep((prev) => (prev + 1) % loadingMessages.length);
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="w-full max-w-4xl mx-auto mt-8 h-[600px] relative rounded-3xl overflow-hidden shadow-2xl border border-white/10 flex items-center justify-center">
      {/* Cinematic Background Rotation */}
      {loadingImages.map((img, i) => (
        <Image
          key={i}
          src={img}
          alt="Loading background"
          fill
          className={`object-cover transition-opacity duration-1000 ${
            i === step % loadingImages.length
              ? "opacity-50 scale-105"
              : "opacity-0 scale-100"
          }`}
        />
      ))}

      <div className="absolute inset-0 bg-linear-to-t from-black via-black/40 to-transparent" />

      <div className="relative z-10 flex flex-col items-center gap-8 p-10 text-center max-w-md">
        <div className="relative">
          <div className="w-20 h-20 rounded-full border-4 border-white/20 border-t-teal-400 animate-spin"></div>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-2xl">✈️</span>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-center gap-3">
            <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
            <span className="text-xs font-mono uppercase tracking-widest text-white/80">
              AI Agent Working
            </span>
          </div>
          <p className="text-3xl font-light text-white leading-tight animate-in fade-in slide-in-from-bottom-2 duration-500 key={step}">
            {loadingMessages[step]}
          </p>
        </div>
      </div>
    </div>
  );
}
