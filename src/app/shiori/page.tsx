import { Suspense } from 'react';
import type { Metadata } from 'next';
import { planService } from '@/lib/plans/service';
import PublicPlanCard from '@/components/features/shiori/PublicPlanCard';
import { JournalSheet, Tape, HandwrittenText } from '@/components/ui/journal';

export const metadata: Metadata = {
  title: 'みんなの旅のしおり',
  description: 'Tabideaで作成・公開された旅行プラン（旅のしおり）の一覧です。次の旅行の参考にしてみましょう。',
};

async function PublicPlansGrid() {
  const { plans, error } = await planService.getPublicPlans({ limit: 50 });

  if (error) {
    return (
      <div className="text-center py-20">
        <p className="text-stone-500">プランの読み込みに失敗しました。</p>
      </div>
    );
  }

  if (!plans || plans.length === 0) {
    return (
      <div className="text-center py-20 bg-white/50 rounded-lg border border-dashed border-stone-300">
        <p className="text-stone-500 font-hand text-lg">まだ公開されたプランはありません。</p>
        <p className="text-sm text-stone-400 mt-2">最初のプランを公開してみませんか？</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 px-4">
      {plans.map((plan) => (
        <PublicPlanCard key={plan.id} plan={plan} />
      ))}
    </div>
  );
}

export default function ShioriPage() {
  return (
    <main className="min-h-screen bg-[#fcfbf9] pb-24 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 pointer-events-none opacity-30 bg-[url('/images/grid-paper.png')] mix-blend-multiply" />

      <div className="max-w-7xl mx-auto pt-32 px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="text-center mb-16 space-y-4">
          <div className="inline-block relative">
            <HandwrittenText tag="h1" className="text-4xl md:text-5xl font-bold text-stone-800 mb-2 transform -rotate-2">
              みんなの旅のしおり
            </HandwrittenText>
            <Tape color="blue" position="top-right" className="opacity-70 -right-8 -top-4 w-24" />
          </div>
          <p className="text-stone-500 font-hand text-lg max-w-2xl mx-auto">
            誰かの旅の記録は、あなたの次の旅のヒントに。<br/>
            Tabideaで作成された素敵な旅行プランを集めました。
          </p>
        </div>

        <Suspense
          fallback={
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 px-4">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-64 bg-stone-100 animate-pulse rounded-sm border border-stone-200" />
              ))}
            </div>
          }
        >
          <PublicPlansGrid />
        </Suspense>
      </div>
    </main>
  );
}
