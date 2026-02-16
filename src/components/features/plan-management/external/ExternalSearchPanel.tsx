'use client';

import { useMemo, useState, useTransition } from 'react';

import type { NormalizedPlanItem } from '@/types/normalized-plan';
import { savePlanItemExternalSelection, upsertBooking } from '@/app/actions/plan-itinerary';

type SearchMode = 'hotel' | 'flight';

interface ExternalResult {
  externalId: string;
  provider: string;
  name: string;
  description?: string;
  price: number | null;
  currency: string | null;
  rating?: number | null;
  imageUrl?: string | null;
  deeplink?: string | null;
  metadata: Record<string, unknown>;
}

interface Props {
  planId: string;
  item: NormalizedPlanItem;
}

export default function ExternalSearchPanel({ planId, item }: Props) {
  const [mode, setMode] = useState<SearchMode>(item.item_type === 'hotel' ? 'hotel' : 'flight');
  const [prompt, setPrompt] = useState('');
  const [conditionsText, setConditionsText] = useState('{}');
  const [results, setResults] = useState<ExternalResult[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const title = useMemo(() => (mode === 'hotel' ? '宿泊候補検索' : '航空券候補検索'), [mode]);

  const generateConditions = () => {
    setError(null);
    startTransition(async () => {
      const res = await fetch('/api/external/conditions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: mode, prompt, context: { itemTitle: item.title, location: item.location } }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? '条件生成に失敗しました');
        return;
      }
      setConditionsText(JSON.stringify(json.conditions, null, 2));
    });
  };

  const runSearch = () => {
    setError(null);
    startTransition(async () => {
      let conditions: unknown;
      try {
        conditions = JSON.parse(conditionsText);
      } catch {
        setError('検索条件JSONの形式が不正です');
        return;
      }
      const endpoint = mode === 'hotel' ? '/api/external/hotels/search' : '/api/external/flights/search';
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId, itemId: item.id, provider: 'amadeus', conditions }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? '検索失敗。条件を調整してください。');
        return;
      }
      setResults(json.results ?? []);
    });
  };

  const adopt = (result: ExternalResult) => {
    setError(null);
    startTransition(async () => {
      const saved = await savePlanItemExternalSelection({
        itemId: item.id,
        provider: result.provider,
        externalId: result.externalId,
        deeplink: result.deeplink,
        priceSnapshot: result.price,
        metadata: result.metadata,
      });
      if (!saved.success) {
        setError(saved.error ?? '採用保存に失敗しました');
        return;
      }

      await upsertBooking({
        itemId: item.id,
        planId,
        bookingUrl: result.deeplink ?? null,
        bookingReference: result.externalId,
        provider: result.provider,
        memo: `${result.name} を候補採用`,
      });
    });
  };

  return (
    <div className="rounded-lg border border-stone-200 p-3 space-y-3 bg-stone-50/40">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold">{title}</h4>
        <select
          className="border rounded px-2 py-1 text-xs"
          value={mode}
          onChange={(e) => setMode(e.target.value as SearchMode)}
        >
          <option value="hotel">ホテル</option>
          <option value="flight">航空券</option>
        </select>
      </div>

      <textarea
        className="w-full border rounded px-2 py-2 text-xs min-h-16"
        placeholder="例: 京都駅から徒歩圏、2名、1泊2万円以下のホテル"
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
      />
      <div className="flex gap-2">
        <button type="button" className="px-3 py-1 rounded bg-stone-900 text-white text-xs" onClick={generateConditions}>AIで条件生成</button>
        <button type="button" className="px-3 py-1 rounded border text-xs" onClick={runSearch}>検索実行</button>
      </div>

      <textarea
        className="w-full border rounded px-2 py-2 text-xs min-h-28 font-mono"
        value={conditionsText}
        onChange={(e) => setConditionsText(e.target.value)}
      />

      {error && <p className="text-xs text-rose-600">{error}</p>}

      <div className="grid gap-2">
        {results.map((result) => (
          <article key={`${result.provider}-${result.externalId}`} className="rounded-md border bg-white p-3 space-y-1">
            <div className="font-medium text-sm">{result.name}</div>
            <p className="text-xs text-stone-600">{result.description ?? '説明なし'}</p>
            <div className="text-xs text-stone-700">
              価格: {result.price !== null ? `${result.price.toLocaleString()} ${result.currency ?? ''}` : 'N/A'}
              {typeof result.rating === 'number' ? ` / 評価: ${result.rating}` : ''}
            </div>
            <button type="button" className="px-3 py-1 rounded bg-primary text-white text-xs" onClick={() => adopt(result)}>
              この候補を採用
            </button>
          </article>
        ))}
      </div>

      {isPending && <p className="text-[11px] text-stone-500">処理中...</p>}
    </div>
  );
}
