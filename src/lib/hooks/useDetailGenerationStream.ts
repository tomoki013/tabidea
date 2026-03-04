"use client";

import { useCallback, useRef } from "react";
import type {
  Article,
  ChunkInfo,
  DayPlan,
  ModelInfo,
  PlanOutline,
  UserInput,
} from "@/types";

interface DetailStreamPayload {
  input: UserInput;
  context: Article[];
  outline: PlanOutline;
}

interface DetailStreamCallbacks {
  onChunkStart?: (chunk: ChunkInfo) => void;
  onChunkComplete?: (
    chunk: ChunkInfo,
    days: DayPlan[],
    modelInfo?: ModelInfo
  ) => void;
  onChunkError?: (chunk: ChunkInfo, message: string) => void;
}

interface DetailStreamResult {
  success: boolean;
  message?: string;
  failedChunks?: number;
}

function parseSSELine(line: string): { type: string; [key: string]: unknown } | null {
  if (!line.startsWith("data: ")) return null;
  try {
    return JSON.parse(line.slice(6));
  } catch {
    return null;
  }
}

export function useDetailGenerationStream() {
  const abortRef = useRef<AbortController | null>(null);

  const abortStream = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
  }, []);

  const streamDetailGeneration = useCallback(
    async (
      payload: DetailStreamPayload,
      callbacks?: DetailStreamCallbacks
    ): Promise<DetailStreamResult> => {
      abortStream();
      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const response = await fetch("/api/generate/details/stream", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
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

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed) continue;

            const event = parseSSELine(trimmed);
            if (!event) continue;

            if (event.type === "progress") {
              const step = event.step as string;
              const chunk = event.chunk as ChunkInfo | undefined;
              if (!chunk) continue;

              if (step === "chunk_start") {
                callbacks?.onChunkStart?.(chunk);
              } else if (step === "chunk_complete") {
                callbacks?.onChunkComplete?.(
                  chunk,
                  (event.days as DayPlan[]) || [],
                  event.modelInfo as ModelInfo | undefined
                );
              } else if (step === "chunk_error") {
                callbacks?.onChunkError?.(
                  chunk,
                  (event.message as string) || "詳細生成に失敗しました"
                );
              }
            } else if (event.type === "complete") {
              return {
                success: true,
                failedChunks: Number(event.failedChunks || 0),
              };
            } else if (event.type === "error") {
              return {
                success: false,
                message: (event.message as string) || "エラーが発生しました",
              };
            }
          }
        }

        return {
          success: false,
          message: "ストリームが予期せず終了しました",
        };
      } catch (error) {
        if ((error as Error).name === "AbortError") {
          return { success: false, message: "詳細生成がキャンセルされました" };
        }
        return {
          success: false,
          message:
            error instanceof Error
              ? error.message
              : "詳細生成中に予期しないエラーが発生しました",
        };
      } finally {
        abortRef.current = null;
      }
    },
    [abortStream]
  );

  return {
    streamDetailGeneration,
    abortStream,
  };
}
