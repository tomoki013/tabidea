import { Suspense } from "react";
import Link from "next/link";
import TravelPlanner from "@/components/TravelPlanner";

export default function Home() {
  return (
    <div className="grid grid-rows-[20px_1fr_20px] items-center justify-items-center min-h-screen p-4 pb-20 gap-8 sm:p-20 sm:gap-16">
      <main className="flex flex-col gap-8 row-start-2 items-center text-center max-w-4xl w-full">
        <h1 className="text-5xl sm:text-7xl font-bold pb-2 animate-in fade-in slide-in-from-top-4 duration-1000 tracking-tight text-foreground">
          AIトラベルプランナー
          <span className="block text-2xl sm:text-3xl mt-4 font-normal text-muted-foreground">
            Powered by ともきちの旅行日記
          </span>
        </h1>
        <p className="text-xl text-muted-foreground animate-in fade-in slide-in-from-top-4 duration-1000 delay-150 font-medium">
          次の冒険を、AIと一緒に見つけよう。
        </p>

        <div className="animate-in fade-in slide-in-from-top-4 duration-1000 delay-200 text-sm text-muted-foreground/80 max-w-2xl bg-muted/30 p-4 rounded-lg border border-border/50">
          <p className="font-medium mb-1">
            このサービスは『ともきちの旅行日記』の記事を参考にしています。
          </p>
          <p className="text-xs">
            ※AIが生成するため、情報の正確性は保証されません。施設の営業状況や料金などは、必ず公式サイト等でご自身でご確認ください。
          </p>
          <p className="text-xs mt-1">
            ※入力された情報はAIモデルの学習には使用されません。詳しくは<Link href="/terms" className="underline hover:text-foreground">利用規約</Link>および<Link href="/privacy" className="underline hover:text-foreground">プライバシーポリシー</Link>をご覧ください。
          </p>
        </div>

        <Suspense
          fallback={
            <div className="w-full max-w-2xl h-[500px] bg-white/5 backdrop-blur-md border border-white/10 rounded-3xl animate-pulse flex items-center justify-center">
              <div className="w-8 h-8 rounded-full border-2 border-white/30 border-t-white animate-spin"></div>
            </div>
          }
        >
          <TravelPlanner />
        </Suspense>

        {/* <div className="flex gap-4 mt-12 text-sm text-muted-foreground/50 animate-in fade-in duration-1000 delay-300">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
            <span>AIモデル準備完了</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-purple-500"></span>
            <span>プレミアム体験</span>
          </div>
        </div> */}
      </main>

      <footer className="row-start-3 flex flex-col items-center gap-4 text-muted-foreground text-sm">
        <div className="flex gap-6">
          <Link
            href="/privacy"
            className="hover:underline hover:text-foreground transition-colors"
          >
            プライバシーポリシー
          </Link>
          <Link
            href="/terms"
            className="hover:underline hover:text-foreground transition-colors"
          >
            利用規約
          </Link>
          <Link
            href="https://travel.tomokichidiary.com/contact"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:underline hover:text-foreground transition-colors"
          >
            お問い合わせ
          </Link>
        </div>
        <p>© 2025 AI Travel Planner. Design inspired by Tomokichi Diary.</p>
      </footer>
    </div>
  );
}
