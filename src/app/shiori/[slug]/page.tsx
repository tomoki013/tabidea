import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { createClient, getUser } from '@/lib/supabase/server';
import ShioriLikeButton from '@/components/features/shiori/ShioriLikeButton';

interface ShioriItem {
  id: string;
  title: string;
  description: string | null;
  start_time: string | null;
  location: string | null;
  journal: {
    id: string;
    content: string;
    updated_at: string;
    phase: 'before' | 'during' | 'after';
    place_name: string | null;
    photo_urls: string[];
    visibility: 'private' | 'public';
  } | null;
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
    likes_count: number | null;
    viewer_liked: boolean | null;
  };
  days: ShioriDay[];
}

interface PageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ t?: string }>;
}

function formatPhaseLabel(phase: 'before' | 'during' | 'after') {
  if (phase === 'before') return '行く前メモ';
  if (phase === 'after') return '行った後メモ';
  return '旅の最中メモ';
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
  const user = await getUser();
  const data = await loadShiori(slug, t);

  if (!data?.plan) notFound();

  const entriesCount = data.days.reduce((count, day) => (
    count + day.items.filter((item) => Boolean(item.journal?.content)).length
  ), 0);

  return (
    <main className="min-h-screen bg-[#fcfbf9] px-4 py-12">
      <div className="mx-auto max-w-5xl space-y-8">
        <header className="rounded-2xl border border-stone-200 bg-white p-6 md:p-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div className="space-y-2">
              <p className="text-xs uppercase tracking-wide text-stone-500">Tabidea Travel Shiori</p>
              <h1 className="text-2xl font-bold text-stone-800 md:text-3xl">
                {data.plan.destination ?? '旅のしおり'}
              </h1>
              <p className="text-sm text-stone-600">
                {data.plan.duration_days ?? '-'}日間 / 記録 {entriesCount}件 / {data.plan.visibility}
              </p>
            </div>
            <ShioriLikeButton
              slug={slug}
              initialLiked={Boolean(data.plan.viewer_liked)}
              initialLikesCount={data.plan.likes_count ?? 0}
              canLike={Boolean(user)}
            />
          </div>
          <Link href="/shiori" className="mt-4 inline-block text-xs font-semibold text-primary hover:underline">
            みんなの旅のしおり一覧に戻る
          </Link>
        </header>

        {data.days?.map((day) => (
          <section key={day.id} className="rounded-2xl border border-stone-200 bg-white p-6 md:p-8">
            <div className="mb-6 flex items-baseline justify-between border-b border-dashed border-stone-200 pb-3">
              <h2 className="text-lg font-semibold text-stone-800">Day {day.day_number}</h2>
              <p className="text-sm text-stone-500">{day.title ?? '旅の記録'}</p>
            </div>

            <div className="space-y-6">
              {day.items?.map((item) => (
                <article key={item.id} className="relative rounded-xl border border-stone-100 bg-stone-50/50 p-4">
                  <div className="mb-2 text-xs font-semibold text-stone-500">
                    {item.start_time ?? '--:--'} / {item.location ?? '場所未設定'}
                  </div>
                  <h3 className="text-base font-bold text-stone-800">{item.title}</h3>
                  {item.description && (
                    <p className="mt-1 text-sm text-stone-600">{item.description}</p>
                  )}

                  {item.journal?.content && (
                    <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-4">
                      <div className="mb-2 flex items-center gap-2">
                        <span className="rounded-full bg-white px-2 py-1 text-xs font-semibold text-amber-700">
                          {formatPhaseLabel(item.journal.phase)}
                        </span>
                        <span className="text-xs text-stone-500">
                          {new Date(item.journal.updated_at).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="whitespace-pre-wrap text-sm leading-relaxed text-stone-700">
                        {item.journal.content}
                      </p>
                      {item.journal.place_name && (
                        <p className="mt-3 text-xs text-stone-600">
                          訪問場所: {item.journal.place_name}
                        </p>
                      )}
                      {item.journal.photo_urls.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {item.journal.photo_urls.map((url) => (
                            <a
                              key={`${item.id}-${url}`}
                              href={url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="rounded-full border border-stone-200 bg-white px-2 py-1 text-xs text-stone-600 hover:bg-stone-100"
                            >
                              写真リンク
                            </a>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </article>
              ))}
            </div>
          </section>
        ))}
      </div>
    </main>
  );
}
