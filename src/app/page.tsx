import { Suspense } from "react";
import Link from "next/link";
import TravelPlanner from "@/components/TravelPlanner";

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen">
      <main className="flex-1 flex flex-col items-center justify-center p-4 sm:p-8">
        <div className="w-full max-w-5xl mx-auto flex flex-col gap-12 items-center text-center">

          {/* Hero Section */}
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-8 duration-1000">
            <h1 className="text-5xl sm:text-7xl font-serif font-bold text-foreground leading-tight drop-shadow-sm">
              心が、どこへ
              <br className="sm:hidden" />
              行きたがっている？
            </h1>
            <p className="text-xl sm:text-2xl text-muted-foreground font-hand rotate-[-2deg]">
              AIと一緒に、次の冒険の物語を書き始めよう。
            </p>
          </div>

          <Suspense
            fallback={
              <div className="w-full max-w-2xl h-[400px] bg-white rounded-3xl border-2 border-dashed border-gray-300 animate-pulse flex items-center justify-center">
                <span className="font-hand text-gray-400 text-xl">
                  ページをめくっています...
                </span>
              </div>
            }
          >
            <TravelPlanner />
          </Suspense>

          {/* Disclaimer / Footer inside content */}
          <div className="mt-8 text-xs text-muted-foreground/60 max-w-lg space-y-2">
            <p>
              Powered by <span className="font-bold">ともきちの旅行日記</span>
            </p>
            <p>
              ※AIが生成する情報は参考情報です。正確な情報は公式サイト等でご確認ください。
              <br />
              ※入力情報はAI学習には使用されません。
              <Link href="/terms" className="underline ml-1 hover:text-primary">利用規約</Link> ・
              <Link href="/privacy" className="underline ml-1 hover:text-primary">プライバシーポリシー</Link>
            </p>
          </div>

        </div>
      </main>

      {/* Simple Footer */}
      <footer className="py-6 text-center text-xs text-muted-foreground border-t border-dashed border-gray-300">
        <p>© 2025 AI Travel Planner. Design inspired by Tomokichi Diary.</p>
      </footer>
    </div>
  );
}
