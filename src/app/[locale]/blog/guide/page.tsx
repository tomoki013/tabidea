import Link from 'next/link';
import type { Metadata } from 'next';
import { localizePath } from '@/lib/i18n/locales';
import { getRequestLanguage } from '@/lib/i18n/server';

export async function generateMetadata(): Promise<Metadata> {
  const language = await getRequestLanguage();
  return language === 'ja'
    ? {
        title: 'Tabidea Blog ガイド',
        description:
          'Tabideaで旅行記事を公開するための使い方と、旅のしおり連携の活用方法を紹介します。',
      }
    : {
        title: 'Tabidea Blog Guide',
        description:
          'Learn how to publish travel articles on Tabidea and embed your travel notes.',
      };
}

export default async function BlogGuidePage() {
  const language = await getRequestLanguage();
  return (
    <main className="mx-auto max-w-4xl space-y-8 px-4 py-24">
      <header className="rounded-2xl border border-stone-200 bg-white p-6">
        <p className="text-xs font-semibold uppercase tracking-widest text-stone-500">Tabidea blog</p>
        <h1 className="mt-2 text-3xl font-bold text-stone-900">
          {language === 'ja' ? '旅の知見を、記事として残す。' : 'Turn travel insights into stories.'}
        </h1>
        <p className="mt-4 text-stone-600">
          {language === 'ja'
            ? 'Tabideaのブログ機能では、旅程の背景や体験談、現地Tipsを読み物として公開できます。公開した旅のしおりを記事内に埋め込めるため、読み手はそのまま行程も確認できます。'
            : 'With Tabidea Blog, you can publish travel stories, context behind your itinerary, and local tips. You can also embed your published travel notes so readers can check the actual route.'}
        </p>
      </header>

      <section className="rounded-2xl border border-stone-200 bg-white p-6">
        <h2 className="text-xl font-semibold text-stone-900">
          {language === 'ja' ? 'できること' : 'What you can do'}
        </h2>
        <ul className="mt-4 list-disc space-y-2 pl-6 text-stone-700">
          <li>{language === 'ja' ? 'ブログ記事の下書き・公開管理' : 'Draft and publish blog posts'}</li>
          <li>{language === 'ja' ? 'プロフィール（@username）付きの公開URL生成' : 'Generate public URLs with your profile (@username)'}</li>
          <li>{language === 'ja' ? '旅のしおり埋め込みによる、実用的な旅行記事の作成' : 'Create practical travel articles with embedded travel notes'}</li>
        </ul>
      </section>

      <section className="rounded-2xl border border-stone-200 bg-white p-6">
        <h2 className="text-xl font-semibold text-stone-900">
          {language === 'ja' ? 'はじめ方' : 'Getting started'}
        </h2>
        <ol className="mt-4 list-decimal space-y-2 pl-6 text-stone-700">
          <li>{language === 'ja' ? 'Tabideaにログイン' : 'Log in to Tabidea'}</li>
          <li>{language === 'ja' ? 'Blog Studioで新規記事を作成' : 'Create a new post in Blog Studio'}</li>
          <li>{language === 'ja' ? '必要に応じて旅のしおりURLを埋め込み、公開' : 'Embed a travel note URL if needed, then publish'}</li>
        </ol>

        <div className="mt-6 flex flex-wrap gap-3">
          <Link href={localizePath('/blog', language)} className="rounded bg-primary px-4 py-2 text-sm font-semibold text-white">
            {language === 'ja' ? 'Blog Studioを開く' : 'Open Blog Studio'}
          </Link>
          <Link href={localizePath('/shiori', language)} className="rounded border border-stone-300 px-4 py-2 text-sm font-semibold text-stone-700">
            {language === 'ja' ? '旅のしおり機能を見る' : 'Explore Travel Notes'}
          </Link>
        </div>
      </section>
    </main>
  );
}
