/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

import StreamingResultView from "./StreamingResultView";
import type { DayPlan, GenerationState, UserInput } from "@/types";
import { initialGenerationState } from "@/types";

const { createTranslator } = vi.hoisted(() => {
  const translationMessages: Record<string, string> = {
    "components.features.planner.streamingResultView.transition.title": "詳細ページへ自動移動します",
    "components.features.planner.streamingResultView.transition.defaultMessage": "詳細が完成しました。数秒以内に自動で詳細ページへ切り替わります。",
    "components.features.planner.streamingResultView.progress.movingToDetail": "詳細ページへ移動中...",
    "components.features.planner.streamingResultView.progress.completed": "生成完了",
    "components.features.planner.streamingResultView.progress.generatingDetails": "詳細プランを生成中...",
    "components.features.planner.streamingResultView.progress.detailReadyMessage": "詳細が完成しました。このまましばらくお待ちください。自動で詳細ページへ移動します。",
    "components.features.planner.streamingResultView.hero.photoBy": "Photo by",
    "components.features.planner.streamingResultView.hero.on": "on",
    "components.features.planner.streamingResultView.hero.unsplash": "Unsplash",
    "components.features.planner.streamingResultView.hero.loadingImage": "画像を読み込み中...",
    "components.features.planner.streamingResultView.hero.destinationLabel": "Your Destination",
    "components.features.planner.streamingResultView.disclaimer.title": "AI生成プランに関する重要なお知らせ",
    "components.features.planner.streamingResultView.disclaimer.body": "このプランはAIによって自動生成されています。",
    "components.features.planner.streamingResultView.shareDisabled": "シェア・PDF出力は生成完了後に利用可能です",
    "components.features.planner.streamingResultView.dayLabel": "日目",
    "components.features.planner.streamingResultView.accommodationDescription": "{day}日目の宿泊エリア",
  };

  const translatorFactory = (namespace: string) => {
    const translate = ((key: string, values?: Record<string, string | number>) => {
      const fullKey = `${namespace}.${key}`;
      if (fullKey === "components.features.planner.streamingResultView.durationString") {
        return `${values?.nights}泊${values?.days}日`;
      }
      if (fullKey === "components.features.planner.streamingResultView.progress.dayCount") {
        return `${values?.completed}/${values?.total} 日`;
      }
      if (fullKey === "components.features.planner.streamingResultView.dayLabelWithNumber") {
        return `${values?.day}日目`;
      }
      if (fullKey === "components.features.planner.streamingResultView.accommodationDescription") {
        return `${values?.day}日目の宿泊エリア`;
      }
      return translationMessages[fullKey] ?? key.split(".").pop() ?? key;
    }) as ((key: string, values?: Record<string, string | number>) => string) & {
      raw: (key: string) => unknown;
    };

    translate.raw = () => [];
    return translate;
  };

  return { createTranslator: translatorFactory };
});

vi.mock("next-intl", () => ({
  useTranslations: (namespace: string) => createTranslator(namespace),
  createTranslator: ({ locale: _locale, messages: _messages, namespace }: { locale?: string; messages?: unknown; namespace?: string }) =>
    createTranslator(namespace || ""),
}));

vi.mock("next/image", () => ({
  default: (props: any) => <img {...props} />,
}));

vi.mock("framer-motion", () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

vi.mock("./DayPlaceholder", () => ({
  default: ({ day, status }: { day: number; status: string }) => (
    <div data-testid={`placeholder-${day}`}>{status}</div>
  ),
}));

vi.mock("@/components/ShareButtons", () => ({
  default: () => <div>share-buttons</div>,
}));

vi.mock("./PDFDownloadButton", () => ({
  default: () => <div>pdf-download</div>,
}));

vi.mock("@/components/features/plan/cards", () => ({
  SpotCard: () => <div>spot-card</div>,
  TransitCard: () => <div>transit-card</div>,
  AccommodationCard: () => <div>accommodation-card</div>,
}));

vi.mock("@/components/features/replan", () => ({
  ReplanTriggerPanel: () => <div>replan-trigger</div>,
}));

vi.mock("@/components/ui/journal", () => ({
  JournalSheet: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  Tape: (props: any) => <div {...props} />,
  HandwrittenText: ({ children, ...props }: any) => <span {...props}>{children}</span>,
}));

const input: UserInput = {
  destinations: ["京都"],
  region: "",
  dates: "2026-04-01から1日間",
  companions: "一人",
  theme: ["グルメ"],
  budget: "standard",
  pace: "balanced",
  freeText: "",
  mustVisitPlaces: [],
  hasMustVisitPlaces: false,
};

const completedDay: DayPlan = {
  day: 1,
  title: "京都散策",
  activities: [
    {
      time: "10:00",
      activity: "清水寺",
      description: "朝の散策",
    },
  ],
};

const createGenerationState = (phase: GenerationState["phase"]): GenerationState => ({
  ...initialGenerationState,
  phase,
  outline: {
    destination: "京都",
    description: "古都を味わう旅",
    days: [
      {
        day: 1,
        title: "京都散策",
        highlight_areas: ["東山"],
        overnight_location: "京都駅周辺",
      },
    ],
  },
  totalDays: 1,
  dayStatuses: new Map([[1, "completed"]]),
  completedDays: [completedDay],
});

describe("StreamingResultView transition notice", () => {
  it("shows transition toast and message while moving to detail page", () => {
    render(
      <StreamingResultView
        generationState={createGenerationState("completed")}
        input={input}
        isTransitioningToDetail={true}
        transitionMessage="詳細プランの保存が完了し次第、すぐに詳細ページへ自動で移動します。"
      />
    );

    expect(screen.getByText("詳細ページへ自動移動します")).toBeInTheDocument();
    expect(screen.getByText("詳細プランの保存が完了し次第、すぐに詳細ページへ自動で移動します。")).toBeInTheDocument();
    expect(screen.getByText("詳細ページへ移動中...")).toBeInTheDocument();
    expect(screen.getByText("詳細が完成しました。このまましばらくお待ちください。自動で詳細ページへ移動します。")).toBeInTheDocument();
  });

  it("does not show transition toast when transition flag is false", () => {
    render(
      <StreamingResultView
        generationState={createGenerationState("completed")}
        input={input}
      />
    );

    expect(screen.queryByText("詳細ページへ移動中")).not.toBeInTheDocument();
  });
});
