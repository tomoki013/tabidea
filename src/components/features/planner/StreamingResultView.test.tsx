/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

import StreamingResultView from "./StreamingResultView";
import type { DayPlan, GenerationState, UserInput } from "@/types";
import { initialGenerationState } from "@/types";

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
