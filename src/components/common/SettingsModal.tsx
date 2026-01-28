"use client";

import { useEffect, useState } from "react";
import { getUserSettings, updateUserSettings } from "@/app/actions/user-settings";
import { FaSpinner, FaSave, FaTimes } from "react-icons/fa";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const [customInstructions, setCustomInstructions] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load settings when modal opens
  useEffect(() => {
    if (isOpen) {
      loadSettings();

      // Lock scroll
      const scrollY = window.scrollY;
      document.documentElement.style.overflow = "hidden";
      document.body.style.overflow = "hidden";

      return () => {
        document.documentElement.style.overflow = "";
        document.body.style.overflow = "";
      };
    }
  }, [isOpen]);

  const loadSettings = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await getUserSettings();
      if (result.success && result.settings) {
        setCustomInstructions(result.settings.customInstructions || "");
      } else {
        setError(result.error || "設定の読み込みに失敗しました");
      }
    } catch (e) {
      setError("エラーが発生しました");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    setError(null);
    try {
      const result = await updateUserSettings({ customInstructions });
      if (result.success) {
        onClose();
      } else {
        setError(result.error || "保存に失敗しました");
      }
    } catch (e) {
      setError("エラーが発生しました");
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-stone-900/50 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-300"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl bg-[#fcfbf9] rounded-xl shadow-2xl relative animate-in zoom-in-95 duration-300 overflow-hidden border border-stone-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-dashed border-stone-200 flex items-center justify-between bg-white/50">
          <h2 className="text-xl font-bold text-stone-800 flex items-center gap-2">
            <span className="text-[#e67e22]">⚙️</span> ユーザー設定
          </h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full hover:bg-stone-100 flex items-center justify-center text-stone-500 hover:text-stone-800 transition-colors"
          >
            <FaTimes />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {isLoading ? (
            <div className="flex justify-center py-12">
              <FaSpinner className="animate-spin text-3xl text-[#e67e22]" />
            </div>
          ) : (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-bold text-stone-700 mb-2">
                  AIへのカスタム指示（制約事項）
                </label>
                <div className="text-xs text-stone-500 mb-2">
                  旅行プラン生成時に、AIに対して必ず守らせたい条件を入力してください。<br/>
                  例：「博物館や美術館は興味がないので含めないで」「足が悪いのであまり歩かないプランで」「朝はゆっくりしたい」
                </div>
                <textarea
                  value={customInstructions}
                  onChange={(e) => setCustomInstructions(e.target.value)}
                  className="w-full h-40 p-4 rounded-lg border border-stone-300 focus:ring-2 focus:ring-[#e67e22] focus:border-transparent bg-white resize-none text-stone-800 placeholder-stone-400"
                  placeholder="ここにAIへの指示を入力してください..."
                />
              </div>

              {error && (
                <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg border border-red-100">
                  {error}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-stone-50 border-t border-stone-200 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-stone-600 hover:text-stone-800 font-medium transition-colors"
            disabled={isSaving}
          >
            キャンセル
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving || isLoading}
            className="px-6 py-2 bg-[#e67e22] hover:bg-[#d35400] text-white rounded-full font-bold shadow-md hover:shadow-lg transition-all flex items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {isSaving ? (
              <>
                <FaSpinner className="animate-spin" /> 保存中...
              </>
            ) : (
              <>
                <FaSave /> 設定を保存
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
