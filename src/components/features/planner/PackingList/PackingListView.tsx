"use client";

import { useState, useMemo, useCallback } from "react";
import { Loader2, CheckCircle2, Circle, ChevronDown, Sparkles } from "lucide-react";
import ModelBadge from "@/components/ui/ModelBadge";
import { motion, AnimatePresence } from "framer-motion";
import { generatePackingList } from "@/app/actions/packing-list";
import type {
  PackingList,
  PackingItem,
  PackingCategory,
} from "@/types/packing-list";
import {
  PACKING_CATEGORY_LABELS,
  PACKING_CATEGORY_ICONS,
  PACKING_PRIORITY_LABELS,
} from "@/types/packing-list";

// ============================================================================
// Types
// ============================================================================

interface PackingListViewProps {
  destination: string;
  days: number;
  themes: string[];
  companions: string;
  budget: string;
  region: string;
  planId?: string;
  // Controlled props
  packingList?: PackingList | null;
  onPackingListChange?: (list: PackingList) => void;
}

// ============================================================================
// Helpers
// ============================================================================

export function getStorageKey(planId?: string, destination?: string): string {
  const id = planId || destination || "default";
  return `packingList:${id}`;
}

function getCheckedKey(planId?: string, destination?: string): string {
  const id = planId || destination || "default";
  return `packingChecked:${id}`;
}

// ============================================================================
// Category Section
// ============================================================================

function CategorySection({
  category,
  items,
  checkedItems,
  onToggle,
}: {
  category: PackingCategory;
  items: PackingItem[];
  checkedItems: Set<string>;
  onToggle: (id: string) => void;
}) {
  const [isOpen, setIsOpen] = useState(true);
  const checkedCount = items.filter((i) => checkedItems.has(i.id)).length;

  return (
    <div className="border border-stone-200 rounded-xl overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-4 hover:bg-stone-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <span className="text-lg">{PACKING_CATEGORY_ICONS[category]}</span>
          <span className="font-bold text-stone-800 text-sm">
            {PACKING_CATEGORY_LABELS[category]}
          </span>
          <span className="text-xs text-stone-400">
            {checkedCount}/{items.length}
          </span>
        </div>
        <ChevronDown
          className={`w-4 h-4 text-stone-400 transition-transform ${isOpen ? "rotate-180" : ""}`}
        />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: "auto" }}
            exit={{ height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 space-y-1">
              {items.map((item) => {
                const isChecked = checkedItems.has(item.id);
                return (
                  <button
                    key={item.id}
                    onClick={() => onToggle(item.id)}
                    className={`w-full flex items-center gap-3 p-2.5 rounded-lg transition-colors text-left ${
                      isChecked
                        ? "bg-green-50 hover:bg-green-100"
                        : "hover:bg-stone-50"
                    }`}
                  >
                    {isChecked ? (
                      <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" />
                    ) : (
                      <Circle className="w-5 h-5 text-stone-300 flex-shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-sm ${
                            isChecked
                              ? "text-stone-400 line-through"
                              : "text-stone-700"
                          }`}
                        >
                          {item.name}
                          {item.quantity && item.quantity > 1
                            ? ` x${item.quantity}`
                            : ""}
                        </span>
                        {item.priority === "essential" && (
                          <span className="text-[10px] font-bold text-red-600 bg-red-50 px-1.5 py-0.5 rounded">
                            {PACKING_PRIORITY_LABELS.essential}
                          </span>
                        )}
                      </div>
                      {item.note && (
                        <p className="text-xs text-stone-400 mt-0.5">
                          {item.note}
                        </p>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export default function PackingListView({
  destination,
  days,
  themes,
  companions,
  budget,
  region,
  planId,
  packingList: controlledList,
  onPackingListChange,
}: PackingListViewProps) {
  // Only initialize from localStorage if NOT controlled
  const [internalList, setInternalList] = useState<PackingList | null>(() => {
    if (controlledList !== undefined) return null;
    if (typeof window === "undefined") return null;
    try {
      const stored = localStorage.getItem(getStorageKey(planId, destination));
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  const packingList = controlledList !== undefined ? controlledList : internalList;

  const [checkedItems, setCheckedItems] = useState<Set<string>>(() => {
    if (typeof window === "undefined") return new Set();
    try {
      const checked = localStorage.getItem(getCheckedKey(planId, destination));
      return checked ? new Set(JSON.parse(checked)) : new Set();
    } catch {
      return new Set();
    }
  });
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [modelName, setModelName] = useState<string | null>(null);

  // Save checked state
  const saveChecked = useCallback(
    (items: Set<string>) => {
      try {
        localStorage.setItem(
          getCheckedKey(planId, destination),
          JSON.stringify(Array.from(items))
        );
      } catch {
        // ignore
      }
    },
    [planId, destination]
  );

  const handleToggle = useCallback(
    (id: string) => {
      setCheckedItems((prev) => {
        const next = new Set(prev);
        if (next.has(id)) {
          next.delete(id);
        } else {
          next.add(id);
        }
        saveChecked(next);
        return next;
      });
    },
    [saveChecked]
  );

  const handleGenerate = async () => {
    setIsGenerating(true);
    setError(null);

    const result = await generatePackingList({
      destination,
      days,
      themes,
      companions,
      budget,
      region,
    });

    if (result.success && result.data) {
      if (result.modelName) setModelName(result.modelName);
      if (onPackingListChange) {
        onPackingListChange(result.data);
      } else {
        setInternalList(result.data);
      }
      setCheckedItems(new Set());
      try {
        localStorage.setItem(
          getStorageKey(planId, destination),
          JSON.stringify(result.data)
        );
        localStorage.removeItem(getCheckedKey(planId, destination));
      } catch {
        // ignore
      }
    } else {
      setError(result.error || "生成に失敗しました");
    }

    setIsGenerating(false);
  };

  // Group items by category
  const groupedItems = useMemo(() => {
    if (!packingList) return new Map<PackingCategory, PackingItem[]>();

    const groups = new Map<PackingCategory, PackingItem[]>();
    const categoryOrder: PackingCategory[] = [
      "documents",
      "clothing",
      "electronics",
      "toiletries",
      "medicine",
      "theme",
      "other",
    ];

    for (const cat of categoryOrder) {
      const items = packingList.items.filter((i) => i.category === cat);
      if (items.length > 0) {
        groups.set(cat, items);
      }
    }

    return groups;
  }, [packingList]);

  // Progress calculation
  const totalItems = packingList?.items.length || 0;
  const checkedCount = checkedItems.size;
  const progressPercent = totalItems > 0 ? (checkedCount / totalItems) * 100 : 0;

  // Not yet generated
  if (!packingList && !isGenerating) {
    return (
      <div className="max-w-2xl mx-auto text-center py-12">
        <div className="text-5xl mb-4">🧳</div>
        <h3 className="text-xl font-bold text-stone-800 mb-2">
          持ち物リストを作成
        </h3>
        <p className="text-sm text-stone-500 mb-6 leading-relaxed">
          {destination}への{days}日間の旅行に最適な<br />
          持ち物リストをAIが提案します
        </p>
        <button
          onClick={handleGenerate}
          className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-full font-bold hover:bg-primary/90 transition-colors shadow-md"
        >
          <Sparkles className="w-4 h-4" />
          AIで持ち物リストを生成
        </button>
      </div>
    );
  }

  // Generating state
  if (isGenerating) {
    return (
      <div className="max-w-2xl mx-auto text-center py-12">
        <Loader2 className="w-8 h-8 text-primary animate-spin mx-auto mb-4" />
        <p className="text-stone-600 font-medium">持ち物リストを生成中...</p>
        <p className="text-xs text-stone-400 mt-1">
          {destination}への旅行に最適なリストを作成しています
        </p>
      </div>
    );
  }

  // Pro required state
  if (error === "pro_required") {
    return (
      <div className="max-w-2xl mx-auto text-center py-12">
        <div className="text-5xl mb-4">🔒</div>
        <h3 className="text-xl font-bold text-stone-800 mb-2">
          Pro限定機能
        </h3>
        <p className="text-sm text-stone-500 mb-6 leading-relaxed">
          AI持ち物リスト生成はProプラン限定の機能です。<br />
          アップグレードして、旅の準備をもっと便利に。
        </p>
        <a
          href="/pricing"
          className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-full font-bold hover:bg-primary/90 transition-colors shadow-md"
        >
          Proにアップグレード
        </a>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="max-w-2xl mx-auto text-center py-12">
        <p className="text-red-600 mb-4">{error}</p>
        <button
          onClick={handleGenerate}
          className="px-4 py-2 bg-primary text-white rounded-full text-sm font-bold"
        >
          再試行
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Progress Bar */}
      <div className="bg-white rounded-2xl p-5 border border-stone-200 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-lg">🧳</span>
            <span className="font-bold text-stone-800">準備状況</span>
          </div>
          <span className="text-sm font-bold text-primary tabular-nums">
            {checkedCount}/{totalItems} 準備完了
          </span>
        </div>
        <div className="w-full h-3 bg-stone-100 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-primary to-amber-400 rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${progressPercent}%` }}
            transition={{ duration: 0.5 }}
          />
        </div>
        {progressPercent === 100 && (
          <p className="text-xs text-green-600 font-medium mt-2 text-center">
            全ての準備が完了しました！良い旅を！
          </p>
        )}
      </div>

      {/* Category Sections */}
      <div className="space-y-3">
        {Array.from(groupedItems.entries()).map(([category, items]) => (
          <CategorySection
            key={category}
            category={category}
            items={items}
            checkedItems={checkedItems}
            onToggle={handleToggle}
          />
        ))}
      </div>

      {/* Regenerate Button */}
      <div className="text-center pt-4">
        <button
          onClick={handleGenerate}
          disabled={isGenerating}
          className="text-sm text-stone-500 hover:text-primary transition-colors underline"
        >
          リストを再生成する
        </button>
      </div>

      {/* Disclaimer */}
      <div className="flex flex-col items-center gap-1">
        {modelName && <ModelBadge modelName={modelName} />}
        <p className="text-[11px] text-stone-400 text-center leading-relaxed">
          ※ AIによる提案です。個人の必要に応じてアイテムを追加・削除してください。
        </p>
      </div>
    </div>
  );
}
