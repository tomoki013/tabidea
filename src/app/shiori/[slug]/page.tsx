import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { createClient } from '@/lib/supabase/server';

interface ShioriItem {
  id: string;
  title: string;
  description: string | null;
  start_time: string | null;
  location: string | null;
  estimated_cost: number | null;
  actual_cost: number | null;
  journal: { content: string } | null;
}

interface ShioriDay {
  id: string;
  day_number: number;
  title: string | null;
  items: ShioriItem[];
}

interface ShioriPayload {
  plan: {
    destination: string | null;
    duration_days: number | null;
    visibility: 'private' | 'unlisted' | 'public';
  };
  days: ShioriDay[];
}

interface PageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ t?: string }>;
}

function formatYen(value: number | null) {
  if (value == null) return null;
  return `¥${Number(value).toLocaleString()}`;
}

async function loadShiori(slug: string, token?: string): Promise<ShioriPayload | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc('get_public_shiori', {
    p_slug: slug,
    p_token: token ?? null,
  });
  if (error) throw error;
  return data as ShioriPayload | null;
}

export async function generateMetadata({ params, searchParams }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const { t } = await searchParams;
  const data = await loadShiori(slug, t);

  if (!data?.plan) return { title: '旅のしおりが見つかりません' };

  const title = data.plan.destination ? `${data.plan.destination}の旅のしおり` : '旅のしおり';
  const description = `${data.plan.duration_days ?? ''}日間の旅程を公開中`;
  const baseUrl = (process.env.NEXT_PUBLIC_APP_URL || 'https://tabide.ai').replace(/\/$/, '');
  const ogImageUrl = `${baseUrl}/api/og?destination=${encodeURIComponent(data.plan.destination ?? '旅')}&days=${data.plan.duration_days ?? ''}`;

  return { title, description, openGraph: { title, description, images: [{ url: ogImageUrl, width: 1200, height: 630 }] } };
}

export default async function ShioriPage({ params, searchParams }: PageProps) {
  const { slug } = await params;
  const { t } = await searchParams;
  const data = await loadShiori(slug, t);

  if (!data?.plan) notFound();

  return (
    <main className="min-h-screen bg-[#fcfbf9] px-4 py-12">
      <div className="mx-auto max-w-4xl space-y-6">
        <header className="rounded-xl border border-stone-200 bg-white p-6">
          <p className="text-xs uppercase tracking-wide text-stone-500">Tabidea Travel Shiori</p>
          <h1 className="text-2xl font-bold text-stone-800">{data.plan.destination ?? '旅のしおり'}</h1>
          <p className="text-sm text-stone-600">{data.plan.duration_days ?? '-'}日間 / {data.plan.visibility}</p>
          <Link href="/shiori" className="mt-3 inline-block text-xs font-semibold text-primary hover:underline">
            旅のしおり機能の紹介ページを見る
          </Link>
        </header>

        {data.days?.map((day) => (
          <section key={day.id} className="rounded-xl border border-stone-200 bg-white p-6">
            <h2 className="text-lg font-semibold">Day {day.day_number}: {day.title}</h2>
            <div className="mt-4 space-y-3">
              {day.items?.map((item) => {
                const estimated = formatYen(item.estimated_cost);
                const actual = formatYen(item.actual_cost);

                return (
                  <article key={item.id} className="rounded-md border border-stone-100 p-3">
                    <div className="text-sm font-semibold text-stone-800">{item.title}</div>
                    {item.description && <p className="text-sm text-stone-600">{item.description}</p>}
                    <div className="mt-1 text-xs text-stone-500">{item.start_time} / {item.location}</div>
                    {estimated && <div className="mt-1 text-xs text-stone-600">概算: {estimated}</div>}
                    {actual && <div className="text-xs text-stone-600">実費: {actual}</div>}
                    {item.journal?.content && <p className="mt-2 whitespace-pre-wrap text-sm text-stone-700">{item.journal.content}</p>}
                  </article>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </main>
  );
}
