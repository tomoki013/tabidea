'use client';

import { useMemo, useState, useTransition } from 'react';
import { FaCheckCircle, FaCopy, FaGlobeAsia, FaLink, FaLock, FaSave, FaUserFriends } from 'react-icons/fa';

import type { NormalizedPlanDay, PlanPublication } from '@/types/normalized-plan';
import {
  updatePlanItemDetails,
  upsertBooking,
  syncJournalEntry,
  upsertPlanPublication,
  adoptExternalSelection,
} from '@/app/actions/plan-itinerary';
import type { ExternalCandidate } from '@/lib/external-providers/types';

interface Props {
  planId: string;
  destination?: string | null;
  days: NormalizedPlanDay[];
  publication: PlanPublication | null;
}

const DRAFT_KEY = 'tabidea-journal-draft';

export default function PlanManagementPanel({ planId, destination, days, publication }: Props) {
  const [localDays, setLocalDays] = useState(days);
  const [publishState, setPublishState] = useState<PlanPublication>(publication ?? {
    slug: '',
    visibility: 'private',
    unlisted_token: null,
    publish_budget: true,
    publish_journal: true,
  });
  const [isPending, startTransition] = useTransition();
  const [searchConditions, setSearchConditions] = useState<Record<string, string>>({});
  const [searchResults, setSearchResults] = useState<Record<string, ExternalCandidate[]>>({});
  const [searchErrors, setSearchErrors] = useState<Record<string, string>>({});

  const totals = useMemo(() => {
    const allItems = localDays.flatMap((day) => day.items);
    const estimated = allItems.reduce((sum, item) => sum + (item.estimated_cost ?? 0), 0);
    const actual = allItems.reduce((sum, item) => sum + (item.actual_cost ?? 0), 0);
    const byCategory = allItems.reduce<Record<string, { estimated: number; actual: number }>>((acc, item) => {
      const key = item.category;
      if (!acc[key]) acc[key] = { estimated: 0, actual: 0 };
      acc[key].estimated += item.estimated_cost ?? 0;
      acc[key].actual += item.actual_cost ?? 0;
      return acc;
    }, {});
    return { estimated, actual, byCategory };
  }, [localDays]);

  const saveDraft = (itemId: string, content: string) => {
    localStorage.setItem(`${DRAFT_KEY}:${itemId}`, content);
  };

  const publishUrl = publishState.slug
    ? `https://shiori.tabide.ai/${publishState.slug}${publishState.visibility === 'unlisted' && publishState.unlisted_token ? `?t=${publishState.unlisted_token}` : ''}`
    : null;

  const visibilityLabel: Record<PlanPublication['visibility'], string> = {
    private: '非公開（自分のみ）',
    unlisted: '限定公開（URLを知っている人のみ）',
    public: '一般公開（誰でも閲覧可）',
  };

  return (
    <section className="w-full max-w-5xl px-4 py-8 space-y-6">
      <div className="rounded-xl border border-stone-200 bg-white p-4">
        <h2 className="font-semibold text-stone-800">予算管理（概算 vs 実費）</h2>
        <p className="text-sm text-stone-600">概算合計: ¥{totals.estimated.toLocaleString()} / 実費合計: ¥{totals.actual.toLocaleString()}</p>
        <div className="mt-2 grid sm:grid-cols-2 lg:grid-cols-5 gap-2 text-xs">
          {Object.entries(totals.byCategory).map(([category, value]) => (
            <div key={category} className="rounded bg-stone-50 p-2">
              <div className="font-medium">{category}</div>
              <div>概算 ¥{Math.round(value.estimated).toLocaleString()}</div>
              <div>実費 ¥{Math.round(value.actual).toLocaleString()}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-stone-200 bg-gradient-to-br from-white via-amber-50/40 to-sky-50/40 p-5 shadow-sm space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="font-semibold text-stone-800 text-lg">旅のしおり公開</h2>
            <p className="text-sm text-stone-600">共有範囲と表示内容をまとめて設定できます</p>
          </div>
          <div className="rounded-full border border-stone-300 bg-white px-3 py-1 text-xs font-semibold text-stone-700">
            現在: {visibilityLabel[publishState.visibility]}
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          {([
            {
              key: 'private' as const,
              title: '非公開',
              desc: '自分だけが閲覧できます。下書き・編集中におすすめ。',
              Icon: FaLock,
              ring: 'from-stone-700/10 to-stone-400/5',
            },
            {
              key: 'unlisted' as const,
              title: '限定公開',
              desc: 'URLを知る相手だけに共有。家族・同行者向け。',
              Icon: FaUserFriends,
              ring: 'from-amber-600/15 to-amber-300/5',
            },
            {
              key: 'public' as const,
              title: '一般公開',
              desc: '検索・共有で見つけてもらえる公開しおり。',
              Icon: FaGlobeAsia,
              ring: 'from-sky-600/15 to-sky-300/5',
            },
          ]).map(({ key, title, desc, Icon, ring }) => {
            const active = publishState.visibility === key;
            return (
              <button
                key={key}
                type="button"
                className={`rounded-xl border p-4 text-left transition-all ${active
                  ? `border-primary bg-gradient-to-br ${ring} shadow-md`
                  : 'border-stone-200 bg-white hover:border-stone-300 hover:shadow-sm'}`}
                onClick={() => setPublishState((prev) => ({ ...prev, visibility: key }))}
              >
                <div className="flex items-center gap-2">
                  <Icon className={`text-sm ${active ? 'text-primary' : 'text-stone-400'}`} />
                  <p className="font-semibold text-sm text-stone-800">{title}</p>
                  {active && <FaCheckCircle className="ml-auto text-primary text-sm" />}
                </div>
                <p className="mt-2 text-xs text-stone-600 leading-relaxed">{desc}</p>
              </button>
            );
          })}
        </div>

        <div className="grid gap-2 sm:grid-cols-2">
          <label className="flex items-center gap-2 rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm">
            <input
              type="checkbox"
              checked={publishState.publish_budget}
              onChange={(e) => setPublishState((p) => ({ ...p, publish_budget: e.target.checked }))}
            />
            予算情報を含める
          </label>
          <label className="flex items-center gap-2 rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm">
            <input
              type="checkbox"
              checked={publishState.publish_journal}
              onChange={(e) => setPublishState((p) => ({ ...p, publish_journal: e.target.checked }))}
            />
            日記を含める
          </label>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-primary text-white text-sm"
            onClick={() => startTransition(async () => {
              const result = await upsertPlanPublication({
                planId,
                destination,
                visibility: publishState.visibility,
                publishBudget: publishState.publish_budget,
                publishJournal: publishState.publish_journal,
              });
              if (result.success) {
                setPublishState((prev) => ({
                  ...prev,
                  slug: result.slug ?? prev.slug,
                  unlisted_token: result.unlistedToken ?? prev.unlisted_token,
                }));
              }
            })}
          >
            <FaSave className="text-xs" />
            {publishState.visibility === 'private' ? '非公開設定を保存' : '公開設定を保存'}
          </button>

          {publishUrl && publishState.visibility !== 'private' && (
            <>
              <a
                href={publishUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-md border border-primary/30 bg-white px-3 py-2 text-xs text-primary hover:bg-primary/5"
              >
                <FaLink /> 公開ページを開く
              </a>
              <button
                type="button"
                className="inline-flex items-center gap-2 rounded-md border border-stone-300 bg-white px-3 py-2 text-xs text-stone-700 hover:bg-stone-50"
                onClick={() => navigator.clipboard.writeText(publishUrl)}
              >
                <FaCopy /> URLをコピー
              </button>
            </>
          )}
        </div>

        {publishUrl && publishState.visibility !== 'private' && (
          <p className="text-xs text-stone-600 break-all">公開URL: {publishUrl}</p>
        )}

        <a href="https://shiori.tabide.ai" target="_blank" rel="noopener noreferrer" className="inline-flex text-xs text-primary hover:underline">
          他の公開しおりを探す
        </a>
      </div>

      {localDays.map((day) => (
        <div key={day.id} className="rounded-xl border border-stone-200 bg-white p-4 space-y-3">
          <h3 className="font-semibold">Day {day.day_number}: {day.title ?? ''}</h3>
          {day.items.map((item) => {
            const draft = typeof window !== 'undefined' ? localStorage.getItem(`${DRAFT_KEY}:${item.id}`) : '';
            return (
              <div key={item.id} className="rounded-md border border-stone-100 p-3 space-y-2">
                <div className="text-sm font-medium">{item.title}</div>
                <div className="grid md:grid-cols-3 gap-2">
                  <input
                    defaultValue={item.actual_cost ?? ''}
                    type="number"
                    placeholder="実費"
                    className="border rounded px-2 py-1 text-sm"
                    onBlur={(e) => {
                      const value = e.target.value ? Number(e.target.value) : null;
                      setLocalDays((prev) => prev.map((d) => d.id === day.id ? { ...d, items: d.items.map((i) => i.id === item.id ? { ...i, actual_cost: value } : i) } : d));
                      startTransition(async () => {
                        await updatePlanItemDetails({ itemId: item.id, actualCost: value, actualCurrency: item.actual_currency || 'JPY', note: item.note });
                      });
                    }}
                  />
                  <input
                    defaultValue={item.bookings?.[0]?.booking_url ?? ''}
                    placeholder="予約URL"
                    className="border rounded px-2 py-1 text-sm"
                    onBlur={(e) => startTransition(async () => {
                      await upsertBooking({ itemId: item.id, planId, bookingUrl: e.target.value || null, bookingReference: item.bookings?.[0]?.booking_reference ?? null, provider: item.bookings?.[0]?.provider ?? null, memo: item.bookings?.[0]?.memo ?? null });
                    })}
                  />
                  <input
                    defaultValue={item.note ?? ''}
                    placeholder="メモ"
                    className="border rounded px-2 py-1 text-sm"
                    onBlur={(e) => {
                      const value = e.target.value || null;
                      startTransition(async () => {
                        await updatePlanItemDetails({ itemId: item.id, actualCost: item.actual_cost, actualCurrency: item.actual_currency || 'JPY', note: value });
                      });
                    }}
                  />
                </div>
                <textarea
                  defaultValue={draft || item.journal?.content || ''}
                  placeholder="旅メモ（日記）"
                  className="border rounded px-2 py-2 text-sm w-full min-h-20"
                  onChange={(e) => saveDraft(item.id, e.target.value)}
                  onBlur={(e) => startTransition(async () => {
                    const content = e.target.value;
                    await syncJournalEntry({ itemId: item.id, planId, content, editedAt: new Date().toISOString() });
                    localStorage.removeItem(`${DRAFT_KEY}:${item.id}`);
                  })}
                />

                {(item.item_type === 'hotel' || item.item_type === 'transit') && (
                  <div className="rounded border border-stone-200 p-3 bg-stone-50 space-y-2">
                    <p className="text-xs font-semibold text-stone-700">外部API候補検索（AI条件JSON）</p>
                    <textarea
                      value={searchConditions[item.id] ?? JSON.stringify(item.item_type === 'hotel' ? {
                        provider: 'amadeus',
                        cityCode: 'TYO',
                        checkInDate: new Date().toISOString().slice(0, 10),
                        checkOutDate: new Date(Date.now() + 86400000).toISOString().slice(0, 10),
                        guests: 2,
                        limit: 3,
                        planId,
                        itemId: item.id,
                      } : {
                        provider: 'amadeus',
                        origin: 'HND',
                        destination: 'ITM',
                        departureDate: new Date().toISOString().slice(0, 10),
                        adults: 1,
                        limit: 3,
                        planId,
                        itemId: item.id,
                      }, null, 2)}
                      className="border rounded px-2 py-2 text-xs w-full min-h-28 font-mono"
                      onChange={(e) => setSearchConditions((prev) => ({ ...prev, [item.id]: e.target.value }))}
                    />
                    <button
                      type="button"
                      className="px-3 py-1 rounded bg-stone-800 text-white text-xs"
                      onClick={() => startTransition(async () => {
                        try {
                          const endpoint = item.item_type === 'hotel' ? '/api/external/hotels/search' : '/api/external/flights/search';
                          const raw = searchConditions[item.id];
                          const payload = raw ? JSON.parse(raw) : {};
                          const res = await fetch(endpoint, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify(payload),
                          });
                          const data = await res.json();
                          if (!res.ok || !data.success) {
                            setSearchErrors((prev) => ({ ...prev, [item.id]: data.error ?? '検索失敗' }));
                            return;
                          }
                          setSearchErrors((prev) => ({ ...prev, [item.id]: '' }));
                          setSearchResults((prev) => ({ ...prev, [item.id]: data.candidates ?? [] }));
                        } catch {
                          setSearchErrors((prev) => ({ ...prev, [item.id]: '条件JSONを調整して再試行してください' }));
                        }
                      })}
                    >候補を検索</button>
                    {searchErrors[item.id] && <p className="text-xs text-red-600">{searchErrors[item.id]}</p>}
                    <div className="space-y-2">
                      {(searchResults[item.id] ?? []).map((candidate) => (
                        <div key={candidate.id} className="rounded border border-stone-200 bg-white p-2 text-xs space-y-1">
                          <div className="font-semibold">{candidate.name}</div>
                          <div>価格: {candidate.price ?? '-'} {candidate.currency ?? ''}</div>
                          <div>評価: {candidate.rating ?? '-'}</div>
                          <div className="break-all text-stone-500">{candidate.deeplink}</div>
                          <button
                            type="button"
                            className="px-2 py-1 rounded bg-primary text-white"
                            onClick={() => startTransition(async () => {
                              const result = await adoptExternalSelection({
                                itemId: item.id,
                                planId,
                                provider: candidate.provider,
                                externalId: candidate.id,
                                deeplink: candidate.deeplink ?? null,
                                price: candidate.price ?? null,
                                currency: candidate.currency ?? null,
                                metadata: {
                                  ...candidate.metadata,
                                  name: candidate.name,
                                  imageUrl: candidate.imageUrl ?? null,
                                  locationLabel: candidate.locationLabel ?? null,
                                },
                              });
                              if (!result.success) {
                                setSearchErrors((prev) => ({ ...prev, [item.id]: result.error ?? '採用に失敗しました' }));
                              }
                            })}
                          >この候補を採用</button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ))}

      {isPending && <p className="text-xs text-stone-500">保存中...</p>}
    </section>
  );
}
