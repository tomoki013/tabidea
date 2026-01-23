"use client";

import { useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FaTimes, FaFilePdf, FaSpinner, FaCheck, FaGlobe } from "react-icons/fa";
import type { TravelInfoCategory } from "@/types";
import type { CategoryState } from "@/components/features/travel-info/types";
import { CATEGORY_INFO } from "@/components/features/travel-info/types";
import { getSingleCategoryInfo } from "@/app/actions/travel-info";

interface PDFExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onExport: (options: PDFExportOptions) => Promise<void>;
  destination: string;
  isGenerating: boolean;
}

export interface PDFExportOptions {
  includeItinerary: boolean;
  includeTravelInfo: boolean;
  travelInfoCategories: TravelInfoCategory[];
  travelInfoData?: Map<TravelInfoCategory, CategoryState>;
}

const TRAVEL_INFO_PRESETS = {
  essential: {
    label: "基本セット",
    description: "必須の安全・基本情報",
    categories: ["basic", "safety", "visa", "healthcare"] as TravelInfoCategory[],
  },
  full: {
    label: "フルセット",
    description: "すべての渡航情報",
    categories: [
      "basic", "safety", "climate", "visa", "manner", "transport",
      "local_food", "souvenir", "events", "technology", "healthcare",
      "restrooms", "smoking", "alcohol"
    ] as TravelInfoCategory[],
  },
};

export default function PDFExportModal({
  isOpen,
  onClose,
  onExport,
  destination,
  isGenerating,
}: PDFExportModalProps) {
  const [includeTravelInfo, setIncludeTravelInfo] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState<"essential" | "full" | "custom">("essential");
  const [selectedCategories, setSelectedCategories] = useState<TravelInfoCategory[]>(
    TRAVEL_INFO_PRESETS.essential.categories
  );
  const [fetchingStatus, setFetchingStatus] = useState<"idle" | "fetching" | "done" | "error">("idle");
  const [fetchedData, setFetchedData] = useState<Map<TravelInfoCategory, CategoryState>>(new Map());
  const [fetchProgress, setFetchProgress] = useState({ current: 0, total: 0 });

  // Handle escape key to close modal
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (event.key === "Escape" && !isGenerating) {
        onClose();
      }
    },
    [onClose, isGenerating]
  );

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
      document.addEventListener("keydown", handleKeyDown);
    } else {
      document.body.style.overflow = "";
    }

    return () => {
      document.body.style.overflow = "";
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, handleKeyDown]);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setFetchingStatus("idle");
      setFetchedData(new Map());
      setFetchProgress({ current: 0, total: 0 });
    }
  }, [isOpen]);

  const handlePresetChange = (preset: "essential" | "full" | "custom") => {
    setSelectedPreset(preset);
    if (preset !== "custom") {
      setSelectedCategories(TRAVEL_INFO_PRESETS[preset].categories);
    }
  };

  const toggleCategory = (category: TravelInfoCategory) => {
    setSelectedPreset("custom");
    setSelectedCategories((prev) =>
      prev.includes(category)
        ? prev.filter((c) => c !== category)
        : [...prev, category]
    );
  };

  const fetchTravelInfo = async (): Promise<Map<TravelInfoCategory, CategoryState>> => {
    const data = new Map<TravelInfoCategory, CategoryState>();
    const categoriesToFetch = selectedCategories;

    setFetchProgress({ current: 0, total: categoriesToFetch.length });
    setFetchingStatus("fetching");

    for (let i = 0; i < categoriesToFetch.length; i++) {
      const category = categoriesToFetch[i];

      // Set loading state for this category
      data.set(category, { status: "loading" });
      setFetchedData(new Map(data));

      try {
        const result = await getSingleCategoryInfo(destination, category);

        if (result.success) {
          data.set(category, {
            status: "success",
            data: result.data,
          });
        } else {
          data.set(category, {
            status: "error",
            error: result.error,
          });
        }
      } catch (error) {
        data.set(category, {
          status: "error",
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }

      setFetchProgress({ current: i + 1, total: categoriesToFetch.length });
      setFetchedData(new Map(data));
    }

    setFetchingStatus("done");
    return data;
  };

  const handleExport = async () => {
    let travelData: Map<TravelInfoCategory, CategoryState> | undefined;

    if (includeTravelInfo && selectedCategories.length > 0) {
      travelData = await fetchTravelInfo();
    }

    await onExport({
      includeItinerary: true,
      includeTravelInfo,
      travelInfoCategories: selectedCategories,
      travelInfoData: travelData,
    });
  };

  if (!isOpen) return null;

  const isProcessing = isGenerating || fetchingStatus === "fetching";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="pdf-export-modal-title"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={() => !isProcessing && onClose()}
        aria-hidden="true"
      />

      {/* Modal Content */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="relative z-10 w-full max-w-lg max-h-[90vh] bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-200 bg-stone-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
              <FaFilePdf className="text-red-600" size={20} />
            </div>
            <div>
              <h2 id="pdf-export-modal-title" className="text-lg font-bold text-stone-800">
                PDF出力設定
              </h2>
              <p className="text-sm text-stone-500">{destination}</p>
            </div>
          </div>
          <button
            onClick={() => !isProcessing && onClose()}
            disabled={isProcessing}
            className="flex items-center justify-center w-10 h-10 rounded-full bg-stone-100 hover:bg-stone-200 transition-colors disabled:opacity-50"
            aria-label="閉じる"
          >
            <FaTimes className="text-stone-600" size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Itinerary Option (Fixed) */}
          <div className="flex items-center justify-between p-4 bg-stone-50 rounded-xl border border-stone-200">
            <div className="flex items-center gap-3">
              <div className="w-5 h-5 rounded bg-primary flex items-center justify-center">
                <FaCheck className="text-white" size={12} />
              </div>
              <div>
                <p className="font-bold text-stone-800">旅程表</p>
                <p className="text-xs text-stone-500">日程・アクティビティ</p>
              </div>
            </div>
            <span className="text-xs text-stone-400 font-medium">必須</span>
          </div>

          {/* Travel Info Option */}
          <div className="space-y-4">
            <label className="flex items-center gap-4 p-4 bg-white rounded-xl border-2 border-stone-200 cursor-pointer hover:border-primary/50 transition-colors">
              <input
                type="checkbox"
                checked={includeTravelInfo}
                onChange={(e) => setIncludeTravelInfo(e.target.checked)}
                className="w-5 h-5 text-primary border-stone-300 rounded focus:ring-primary cursor-pointer"
              />
              <div className="flex items-center gap-3 flex-1">
                <FaGlobe className="text-primary" size={20} />
                <div>
                  <p className="font-bold text-stone-800">渡航情報・安全ガイド</p>
                  <p className="text-xs text-stone-500">安全情報、ビザ、マナーなど</p>
                </div>
              </div>
            </label>

            {/* Travel Info Categories */}
            <AnimatePresence>
              {includeTravelInfo && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  <div className="space-y-4 pt-2">
                    {/* Presets */}
                    <div className="flex gap-2">
                      {(["essential", "full"] as const).map((preset) => (
                        <button
                          key={preset}
                          onClick={() => handlePresetChange(preset)}
                          className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                            selectedPreset === preset
                              ? "bg-primary text-white"
                              : "bg-stone-100 text-stone-600 hover:bg-stone-200"
                          }`}
                        >
                          {TRAVEL_INFO_PRESETS[preset].label}
                        </button>
                      ))}
                    </div>

                    {/* Category Grid */}
                    <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto p-2 bg-stone-50 rounded-lg">
                      {Object.entries(CATEGORY_INFO).map(([key, info]) => {
                        const category = key as TravelInfoCategory;
                        const isSelected = selectedCategories.includes(category);
                        return (
                          <button
                            key={category}
                            onClick={() => toggleCategory(category)}
                            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-left text-sm transition-colors ${
                              isSelected
                                ? "bg-primary/10 text-primary border border-primary/30"
                                : "bg-white text-stone-600 border border-stone-200 hover:bg-stone-100"
                            }`}
                          >
                            <div
                              className={`w-4 h-4 rounded flex items-center justify-center ${
                                isSelected ? "bg-primary" : "bg-stone-200"
                              }`}
                            >
                              {isSelected && <FaCheck className="text-white" size={10} />}
                            </div>
                            <span className="truncate">{info.label}</span>
                          </button>
                        );
                      })}
                    </div>

                    <p className="text-xs text-stone-500 text-center">
                      {selectedCategories.length}カテゴリ選択中
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Fetching Progress */}
          <AnimatePresence>
            {fetchingStatus === "fetching" && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="p-4 bg-blue-50 rounded-xl border border-blue-200"
              >
                <div className="flex items-center gap-3">
                  <FaSpinner className="animate-spin text-blue-600" size={20} />
                  <div className="flex-1">
                    <p className="font-medium text-blue-800">渡航情報を取得中...</p>
                    <p className="text-sm text-blue-600">
                      {fetchProgress.current} / {fetchProgress.total} カテゴリ完了
                    </p>
                  </div>
                </div>
                <div className="mt-3 w-full h-2 bg-blue-200 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-blue-600"
                    initial={{ width: 0 }}
                    animate={{
                      width: `${(fetchProgress.current / fetchProgress.total) * 100}%`,
                    }}
                    transition={{ duration: 0.3 }}
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-stone-200 bg-stone-50">
          <button
            onClick={onClose}
            disabled={isProcessing}
            className="px-6 py-2.5 rounded-full border-2 border-stone-300 text-stone-700 hover:bg-stone-100 transition-colors font-medium disabled:opacity-50"
          >
            キャンセル
          </button>
          <button
            onClick={handleExport}
            disabled={isProcessing}
            className="flex items-center gap-2 px-6 py-2.5 rounded-full bg-[#DC2626] hover:bg-[#B91C1C] text-white transition-colors shadow-md hover:shadow-lg font-bold disabled:opacity-50"
          >
            {isProcessing ? (
              <>
                <FaSpinner className="animate-spin" size={16} />
                <span>作成中...</span>
              </>
            ) : (
              <>
                <FaFilePdf size={16} />
                <span>PDF作成</span>
              </>
            )}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
