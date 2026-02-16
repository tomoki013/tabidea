import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Tabidea Blog ガイド',
  description: 'blog.tabide.ai で旅行記事を公開するための使い方と、旅のしおり連携の活用方法を紹介します。',
};

export default function BlogGuidePage() {
  return (
    <main className="mx-auto max-w-4xl space-y-8 px-4 py-24">
      <header className="rounded-2xl border border-stone-200 bg-white p-6">
        <p className="text-xs font-semibold uppercase tracking-widest text-stone-500">Tabidea blog</p>
        <h1 className="mt-2 text-3xl font-bold text-stone-900">旅の知見を、記事として残す。</h1>
        <p className="mt-4 text-stone-600">
          Tabideaのブログ機能では、旅程の背景や体験談、現地Tipsを読み物として公開できます。
          公開した旅のしおりを記事内に埋め込めるため、読み手はそのまま行程も確認できます。
        </p>
      </header>

      <section className="rounded-2xl border border-stone-200 bg-white p-6">
        <h2 className="text-xl font-semibold text-stone-900">できること</h2>
        <ul className="mt-4 list-disc space-y-2 pl-6 text-stone-700">
          <li>ブログ記事の下書き・公開管理</li>
          <li>プロフィール（@username）付きの公開URL生成</li>
          <li>旅のしおり埋め込みによる、実用的な旅行記事の作成</li>
        </ul>
      </section>

      <section className="rounded-2xl border border-stone-200 bg-white p-6">
        <h2 className="text-xl font-semibold text-stone-900">はじめ方</h2>
        <ol className="mt-4 list-decimal space-y-2 pl-6 text-stone-700">
          <li>Tabideaにログイン</li>
          <li>Blog Studioで新規記事を作成</li>
          <li>必要に応じて旅のしおりURLを埋め込み、公開</li>
        </ol>

        <div className="mt-6 flex flex-wrap gap-3">
          <Link href="/blog" className="rounded bg-primary px-4 py-2 text-sm font-semibold text-white">
            Blog Studioを開く
          </Link>
          <Link href="/shiori" className="rounded border border-stone-300 px-4 py-2 text-sm font-semibold text-stone-700">
            旅のしおり機能を見る
          </Link>
        </div>
      </section>
    </main>
  );
}
