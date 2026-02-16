'use client';

import { useMemo, useState, useTransition } from 'react';

import type { NormalizedPlanItem } from '@/types/normalized-plan';
import { adoptExternalSelection } from '@/app/actions/plan-itinerary';

interface Props {
  planId: string;
  item: NormalizedPlanItem;
}

type Candidate = {
  id: string;
  provider: string;
  label: string;
  price: number | null;
  currency: string | null;
  rating?: number | null;
  deeplink: string | null;
  raw: Record<string, unknown>;
};

export function ExternalSuggestionsPanel({ planId, item }: Props) {
  const mode = item.item_type === 'transit' ? 'flights' : 'hotels';
  const initial = useMemo(() => {
    if (mode === 'flights') {
      return {
        originLocationCode: 'HND',
        destinationLocationCode: 'CTS',
        departureDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
        adults: 1,
        max: 3,
      };
    }
    return {
      cityCode: 'TYO',
      checkInDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
      checkOutDate: new Date(Date.now() + 8 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
      guests: 2,
      limit: 3,
    };
  }, [mode]);

  const [criteriaText, setCriteriaText] = useState(JSON.stringify(initial, null, 2));
  const [results, setResults] = useState<Candidate[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const search = () => {
    startTransition(async () => {
      try {
        setError(null);
        const criteria = JSON.parse(criteriaText);
        const endpoint = mode === 'hotels' ? '/api/external/hotels/search' : '/api/external/flights/search';

        const res = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ planId, itemId: item.id, provider: 'amadeus', criteria }),
        });

        const json = await res.json();
        if (!res.ok) throw new Error(json?.error ?? '検索に失敗しました。');

        const mapped = (json.results ?? []).map((r: Record<string, unknown>) => ({
          id: String(r.id),
          provider: String(r.provider),
          label: mode === 'hotels' ? String(r.name ?? 'Hotel') : String(r.summary ?? 'Flight'),
          price: typeof r.price === 'number' ? r.price : null,
          currency: r.currency ?? null,
          rating: typeof r.rating === 'number' ? r.rating : null,
          deeplink: r.deeplink ?? null,
          raw: r,
        }));

        setResults(mapped);
      } catch (e) {
        setError(e instanceof Error ? e.message : '検索に失敗しました。条件を調整して再試行してください。');
      }
    });
  };

  const adopt = (candidate: Candidate) => {
    startTransition(async () => {
      const adopted = await adoptExternalSelection({
        itemId: item.id,
        planId,
        provider: candidate.provider,
        externalId: candidate.id,
        deeplink: candidate.deeplink,
        priceSnapshot: { price: candidate.price, currency: candidate.currency },
        metadataJson: candidate.raw,
      });
      if (!adopted.success) setError(adopted.error ?? '採用に失敗しました。');
    });
  };

  return (
    <div className="rounded-md border border-stone-200 bg-stone-50 p-3 space-y-3">
      <p className="text-sm font-semibold">外部API候補（{mode === 'hotels' ? 'ホテル' : '航空券'}）</p>
      <textarea className="w-full min-h-28 rounded border border-stone-300 px-2 py-1 text-xs font-mono" value={criteriaText} onChange={(e) => setCriteriaText(e.target.value)} />
      <button type="button" className="px-3 py-1 rounded bg-primary text-white text-sm" onClick={search}>候補を検索</button>
      {error && <p className="text-xs text-red-600">{error}</p>}
      <div className="space-y-2">
        {results.map((candidate) => (
          <div key={candidate.id} className="rounded border border-stone-200 bg-white p-2 text-sm">
            <div className="font-medium">{candidate.label}</div>
            <div className="text-xs text-stone-600">
              {candidate.price ? `${candidate.currency ?? ''} ${candidate.price}` : '価格情報なし'}{mode === 'hotels' ? ` / 評価 ${candidate.rating ?? '-'}` : ''}
            </div>
            <button type="button" className="mt-2 px-3 py-1 rounded border text-xs" onClick={() => adopt(candidate)}>採用して予約入力へ</button>
          </div>
        ))}
      </div>
      {isPending && <p className="text-xs text-stone-500">処理中...</p>}
    </div>
  );
}
