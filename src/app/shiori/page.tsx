import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '旅のしおりガイド',
  description: 'Tabideaで作成した旅行プランを、共有しやすい「旅のしおり」として公開する方法を紹介します。',
};

export default function ShioriGuidePage() {
  return (
    <main className="mx-auto max-w-4xl space-y-8 px-4 py-24">
      <header className="rounded-2xl border border-stone-200 bg-white p-6">
        <p className="text-xs font-semibold uppercase tracking-widest text-stone-500">Tabidea Travel Shiori</p>
        <h1 className="mt-2 text-3xl font-bold text-stone-900">旅程を、みんなで見られる「旅のしおり」に。</h1>
        <p className="mt-4 text-stone-600">
          旅のしおり機能では、旅行プランを公開URL化して共有できます。同行者との合意形成、家族への共有、
          当日の確認まで、1つのページで完結します。
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link href="/my-plans" className="rounded bg-primary px-4 py-2 text-sm font-semibold text-white">
            自分の旅のしおりを編集する
          </Link>
          <a
            href="https://shiori.tabide.ai"
            target="_blank"
            rel="noopener noreferrer"
            className="rounded border border-stone-300 px-4 py-2 text-sm font-semibold text-stone-700"
          >
            公開旅のしおりを探す
          </a>
        </div>
      </header>

      <section className="rounded-2xl border border-stone-200 bg-white p-6">
        <h2 className="text-xl font-semibold text-stone-900">公開ステータスの使い分け</h2>
        <ul className="mt-4 list-disc space-y-2 pl-6 text-stone-700">
          <li>private（非公開）: URLを知っていても閲覧不可。編集中の旅のしおりに最適。</li>
          <li>unlisted（限定公開）: トークン付きURLのみ閲覧可能。同行者だけに共有したい時に便利。</li>
          <li>public（公開）: 誰でも閲覧可能。旅の記録を広く公開したい時におすすめ。</li>
        </ul>
      </section>

      <section className="rounded-2xl border border-stone-200 bg-white p-6">
        <h2 className="text-xl font-semibold text-stone-900">旅のしおりを使いやすくするコツ</h2>
        <ul className="mt-4 list-disc space-y-2 pl-6 text-stone-700">
          <li>日毎の行動・費用・メモを更新して、当日の確認画面として使う</li>
          <li>ブログに埋め込んで、行程付きの旅行記事にする</li>
          <li>公開前に「予算情報」「日記」の表示範囲を調整して、見せたい情報だけ公開する</li>
        </ul>

        <div className="mt-6 flex flex-wrap gap-3">
          <Link href="/blog/guide" className="rounded border border-stone-300 px-4 py-2 text-sm font-semibold text-stone-700">
            ブログ連携を見る
          </Link>
          <Link href="/blog" className="rounded border border-stone-300 px-4 py-2 text-sm font-semibold text-stone-700">
            ブログを編集する
          </Link>
        </div>
      </section>
    </main>
  );
}
