"use client";

import { useState, useCallback, useRef } from "react";
import type { UserInput } from "@/types";
import type { OutlineActionState } from "@/lib/services/plan-generation/generate-outline";

// ============================================================================
// Types
// ============================================================================

export interface GenerationStep {
  id: string;
  message: string;
  status: "pending" | "active" | "completed";
}

const OUTLINE_STEPS: { id: string; message: string }[] = [
  { id: "usage_check", message: "利用制限を確認中..." },
  { id: "cache_check", message: "キャッシュを確認中..." },
  { id: "rag_search", message: "関連記事を検索中..." },
  { id: "prompt_build", message: "プロンプトを構築中..." },
  { id: "ai_generation", message: "AIがプランを生成中..." },
  { id: "hero_image", message: "メイン画像を取得中..." },
];

// ============================================================================
// SSE Parser
// ============================================================================

function parseSSELine(line: string): { type: string; [key: string]: unknown } | null {
  if (!line.startsWith("data: ")) return null;
  try {
    return JSON.parse(line.slice(6));
  } catch {
    return null;
  }
}

// ============================================================================
// Hook
// ============================================================================

export function useGenerationProgress() {
  const [steps, setSteps] = useState<GenerationStep[]>([]);
  const [currentStep, setCurrentStep] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const resetProgress = useCallback(() => {
    setSteps([]);
    setCurrentStep(null);
  }, []);

  const generateOutlineStream = useCallback(
    async (
      input: UserInput,
      options?: { isRetry?: boolean }
    ): Promise<OutlineActionState> => {
      // Initialize steps
      setSteps(
        OUTLINE_STEPS.map((s) => ({ ...s, status: "pending" as const }))
      );
      setCurrentStep(null);

      // Abort any previous stream
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      const response = await fetch("/api/generate/outline", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ input, options }),
        signal: controller.signal,
      });

      if (!response.ok || !response.body) {
        return {
          success: false,
          message: `HTTP ${response.status}: リクエストに失敗しました`,
        };
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      return new Promise<OutlineActionState>((resolve, reject) => {
        const processStream = async () => {
          try {
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;

              buffer += decoder.decode(value, { stream: true });

              // Process complete lines
              const lines = buffer.split("\n");
              buffer = lines.pop() || "";

              for (const line of lines) {
                const trimmed = line.trim();
                if (!trimmed) continue;

                const event = parseSSELine(trimmed);
                if (!event) continue;

                if (event.type === "progress") {
                  const stepId = event.step as string;
                  setCurrentStep(stepId);
                  setSteps((prev) =>
                    prev.map((s) => {
                      if (s.id === stepId) {
                        return { ...s, status: "active", message: (event.message as string) || s.message };
                      }
                      // Mark previous steps as completed
                      const currentIdx = OUTLINE_STEPS.findIndex((os) => os.id === stepId);
                      const thisIdx = OUTLINE_STEPS.findIndex((os) => os.id === s.id);
                      if (thisIdx < currentIdx && s.status !== "completed") {
                        return { ...s, status: "completed" };
                      }
                      return s;
                    })
                  );
                } else if (event.type === "complete") {
                  // Mark all steps completed
                  setSteps((prev) =>
                    prev.map((s) => ({ ...s, status: "completed" }))
                  );
                  setCurrentStep(null);
                  const result = event.result as OutlineActionState;
                  resolve(result);
                  return;
                } else if (event.type === "error") {
                  setCurrentStep(null);
                  resolve({
                    success: false,
                    message: (event.message as string) || "エラーが発生しました",
                    limitExceeded: event.limitExceeded as boolean | undefined,
                    userType: event.userType as OutlineActionState["userType"],
                    resetAt: event.resetAt as string | null | undefined,
                    remaining: event.remaining as number | undefined,
                  });
                  return;
                }
              }
            }

            // If stream ended without complete/error event
            resolve({
              success: false,
              message: "ストリームが予期せず終了しました",
            });
          } catch (err) {
            if ((err as Error).name === "AbortError") {
              resolve({ success: false, message: "生成がキャンセルされました" });
            } else {
              reject(err);
            }
          }
        };

        processStream();
      });
    },
    []
  );

  return {
    steps,
    currentStep,
    generateOutlineStream,
    resetProgress,
  };
}
