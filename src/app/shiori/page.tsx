import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'しおり（Shiori）ガイド',
  description: 'Tabideaで作成した旅行プランを、共有しやすい「しおり」として公開する方法を紹介します。',
};

export default function ShioriGuidePage() {
  return (
    <main className="mx-auto max-w-4xl space-y-8 px-4 py-24">
      <header className="rounded-2xl border border-stone-200 bg-white p-6">
        <p className="text-xs font-semibold uppercase tracking-widest text-stone-500">Tabidea Shiori</p>
        <h1 className="mt-2 text-3xl font-bold text-stone-900">旅程を、みんなで見られる「しおり」に。</h1>
        <p className="mt-4 text-stone-600">
          しおり機能では、旅行プランを公開URL化して共有できます。同行者との合意形成、家族への共有、
          当日の確認まで、1つのページで完結します。
        </p>
      </header>

      <section className="rounded-2xl border border-stone-200 bg-white p-6">
        <h2 className="text-xl font-semibold text-stone-900">主な公開設定</h2>
        <ul className="mt-4 list-disc space-y-2 pl-6 text-stone-700">
          <li>private（非公開）: URLを知っていても閲覧不可</li>
          <li>unlisted（限定公開）: トークン付きURLのみ閲覧可能</li>
          <li>public（公開）: 誰でも閲覧可能</li>
        </ul>
      </section>

      <section className="rounded-2xl border border-stone-200 bg-white p-6">
        <h2 className="text-xl font-semibold text-stone-900">活用のヒント</h2>
        <ul className="mt-4 list-disc space-y-2 pl-6 text-stone-700">
          <li>ブログに埋め込んで、行程付きの旅行記事にする</li>
          <li>日毎の行動・費用・メモをあとで振り返る</li>
          <li>出発前に同行者と移動・集合時間を共有しておく</li>
        </ul>

        <div className="mt-6 flex flex-wrap gap-3">
          <Link href="/my-plans" className="rounded bg-primary px-4 py-2 text-sm font-semibold text-white">
            自分のプランを見る
          </Link>
          <Link href="/blog/guide" className="rounded border border-stone-300 px-4 py-2 text-sm font-semibold text-stone-700">
            ブログ連携を見る
          </Link>
        </div>
      </section>
    </main>
  );
}
