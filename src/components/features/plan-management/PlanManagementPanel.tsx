'use client';

import { useMemo, useState, useTransition } from 'react';

import type { NormalizedPlanDay, PlanPublication } from '@/types/normalized-plan';
import {
  updatePlanItemDetails,
  upsertBooking,
  syncJournalEntry,
  upsertPlanPublication,
} from '@/app/actions/plan-itinerary';

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

      <div className="rounded-xl border border-stone-200 bg-white p-4 space-y-3">
        <h2 className="font-semibold text-stone-800">旅のしおり公開</h2>
        <div className="flex flex-wrap gap-2">
          {(['private', 'unlisted', 'public'] as const).map((visibility) => (
            <button
              key={visibility}
              type="button"
              className={`px-3 py-1 rounded-full border text-sm ${publishState.visibility === visibility ? 'bg-primary text-white' : 'bg-white'}`}
              onClick={() => setPublishState((prev) => ({ ...prev, visibility }))}
            >
              {visibility}
            </button>
          ))}
        </div>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={publishState.publish_budget} onChange={(e) => setPublishState((p) => ({ ...p, publish_budget: e.target.checked }))} />予算情報を含める</label>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={publishState.publish_journal} onChange={(e) => setPublishState((p) => ({ ...p, publish_journal: e.target.checked }))} />日記を含める</label>
        <button
          type="button"
          className="px-4 py-2 rounded-md bg-primary text-white text-sm"
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
        >公開設定を保存</button>
        {publishUrl && <p className="text-xs text-stone-600 break-all">公開URL: {publishUrl}</p>}
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
              </div>
            );
          })}
        </div>
      ))}

      {isPending && <p className="text-xs text-stone-500">保存中...</p>}
    </section>
  );
}
