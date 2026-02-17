'use client';

import { useEffect, useMemo, useState } from 'react';
import { FaMapMarkerAlt, FaRegSave } from 'react-icons/fa';

import type { NormalizedPlanDay } from '@/types/normalized-plan';

type JournalPhase = 'before' | 'during' | 'after';

interface JournalDraft {
  content: string;
  phase: JournalPhase;
  placeName: string;
  photoUrlsText: string;
  dirty: boolean;
  updatedAt: string | null;
}

interface ShioriJournalEditorProps {
  days: NormalizedPlanDay[];
  onSaveEntry: (input: {
    itemId: string;
    content: string;
    phase: JournalPhase;
    placeName: string | null;
    photoUrls: string[];
  }) => Promise<{ success: boolean; error?: string; updatedAt?: string }>;
}

function buildInitialDrafts(days: NormalizedPlanDay[]) {
  const initial: Record<string, JournalDraft> = {};

  for (const day of days) {
    for (const item of day.items) {
      const journal = item.journal;
      initial[item.id] = {
        content: journal?.content ?? '',
        phase: journal?.phase ?? 'during',
        placeName: journal?.place_name ?? item.location ?? '',
        photoUrlsText: (journal?.photo_urls ?? []).join('\n'),
        dirty: false,
        updatedAt: journal?.updated_at ?? null,
      };
    }
  }

  return initial;
}

function parsePhotoUrls(photoUrlsText: string) {
  return photoUrlsText
    .split(/\r?\n|,/)
    .map((url) => url.trim())
    .filter(Boolean);
}

export default function ShioriJournalEditor({ days, onSaveEntry }: ShioriJournalEditorProps) {
  const [drafts, setDrafts] = useState<Record<string, JournalDraft>>(() => buildInitialDrafts(days));
  const [savingIds, setSavingIds] = useState<Record<string, boolean>>({});
  const [errorByItemId, setErrorByItemId] = useState<Record<string, string | null>>({});

  const totalEntries = useMemo(
    () => days.reduce((count, day) => count + day.items.filter((item) => Boolean(item.journal?.content)).length, 0),
    [days]
  );

  useEffect(() => {
    setDrafts(buildInitialDrafts(days));
  }, [days]);

  const updateDraft = (itemId: string, patch: Partial<JournalDraft>) => {
    setDrafts((prev) => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        ...patch,
        dirty: true,
      },
    }));
  };

  const handleSave = async (itemId: string) => {
    const draft = drafts[itemId];
    if (!draft) return;

    if (!draft.content.trim()) {
      setErrorByItemId((prev) => ({
        ...prev,
        [itemId]: '本文を入力してください。',
      }));
      return;
    }

    setSavingIds((prev) => ({ ...prev, [itemId]: true }));
    setErrorByItemId((prev) => ({ ...prev, [itemId]: null }));

    const result = await onSaveEntry({
      itemId,
      content: draft.content.trim(),
      phase: draft.phase,
      placeName: draft.placeName.trim() || null,
      photoUrls: parsePhotoUrls(draft.photoUrlsText),
    });

    setSavingIds((prev) => ({ ...prev, [itemId]: false }));

    if (!result.success) {
      setErrorByItemId((prev) => ({
        ...prev,
        [itemId]: result.error ?? '保存に失敗しました。',
      }));
      return;
    }

    setDrafts((prev) => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        dirty: false,
        updatedAt: result.updatedAt ?? new Date().toISOString(),
      },
    }));
  };

  return (
    <div className="mx-auto w-full max-w-5xl space-y-8">
      <div className="rounded-xl border border-stone-200 bg-white p-5">
        <h3 className="text-lg font-bold text-stone-800">しおり記録</h3>
        <p className="mt-1 text-sm text-stone-600">
          旅程スポットごとに、行く前・旅の最中・行った後のメモを残せます。記録済み {totalEntries} 件
        </p>
      </div>

      {days.map((day) => (
        <section key={day.id} className="rounded-xl border border-stone-200 bg-white p-5">
          <div className="mb-4 border-b border-dashed border-stone-200 pb-3">
            <h4 className="text-lg font-semibold text-stone-800">Day {day.day_number}</h4>
            <p className="text-sm text-stone-500">{day.title ?? '旅程'}</p>
          </div>

          <div className="space-y-4">
            {day.items.map((item) => {
              const draft = drafts[item.id];
              if (!draft) return null;

              return (
                <article key={item.id} className="rounded-lg border border-stone-200 bg-stone-50/50 p-4">
                  <div className="mb-3">
                    <p className="text-xs text-stone-500">{item.start_time ?? '--:--'}</p>
                    <h5 className="text-base font-semibold text-stone-800">{item.title}</h5>
                    {item.location && (
                      <p className="mt-1 flex items-center gap-1 text-xs text-stone-500">
                        <FaMapMarkerAlt className="text-stone-400" />
                        {item.location}
                      </p>
                    )}
                  </div>

                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    <label className="flex flex-col gap-1 text-xs font-semibold text-stone-600">
                      記録フェーズ
                      <select
                        value={draft.phase}
                        onChange={(event) => updateDraft(item.id, { phase: event.target.value as JournalPhase })}
                        className="rounded-md border border-stone-200 bg-white px-3 py-2 text-sm text-stone-700"
                      >
                        <option value="before">行く前</option>
                        <option value="during">旅の最中</option>
                        <option value="after">行った後</option>
                      </select>
                    </label>

                    <label className="flex flex-col gap-1 text-xs font-semibold text-stone-600">
                      訪問場所
                      <input
                        type="text"
                        value={draft.placeName}
                        onChange={(event) => updateDraft(item.id, { placeName: event.target.value })}
                        placeholder="例: 錦市場"
                        className="rounded-md border border-stone-200 bg-white px-3 py-2 text-sm text-stone-700"
                      />
                    </label>
                  </div>

                  <label className="mt-3 flex flex-col gap-1 text-xs font-semibold text-stone-600">
                    メモ本文
                    <textarea
                      value={draft.content}
                      onChange={(event) => updateDraft(item.id, { content: event.target.value })}
                      placeholder="ここで何をしたか、何を食べたか、感じたことを記録..."
                      className="min-h-[100px] rounded-md border border-stone-200 bg-white px-3 py-2 text-sm text-stone-700"
                    />
                  </label>

                  <label className="mt-3 flex flex-col gap-1 text-xs font-semibold text-stone-600">
                    写真URL（改行またはカンマ区切り）
                    <textarea
                      value={draft.photoUrlsText}
                      onChange={(event) => updateDraft(item.id, { photoUrlsText: event.target.value })}
                      placeholder="https://..."
                      className="min-h-[72px] rounded-md border border-stone-200 bg-white px-3 py-2 text-sm text-stone-700"
                    />
                  </label>

                  <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div className="text-xs text-stone-500">
                      {draft.updatedAt ? `最終保存: ${new Date(draft.updatedAt).toLocaleString()}` : 'まだ保存されていません'}
                    </div>
                    <button
                      onClick={() => void handleSave(item.id)}
                      disabled={savingIds[item.id] || !draft.dirty}
                      className="inline-flex items-center justify-center gap-2 rounded-full border border-stone-300 bg-white px-4 py-2 text-xs font-bold text-stone-700 transition hover:bg-stone-100 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <FaRegSave />
                      {savingIds[item.id] ? '保存中...' : 'この記録を保存'}
                    </button>
                  </div>
                  {errorByItemId[item.id] && (
                    <p className="mt-2 text-xs text-rose-600">{errorByItemId[item.id]}</p>
                  )}
                </article>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
