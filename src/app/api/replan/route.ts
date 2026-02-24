/**
 * POST /api/replan — リプラン API エンドポイント
 *
 * 旅行中の状況変化に応じて代替プランを提案する。
 * 3秒以内にレスポンスを返却する（AbortSignal で強制終了）。
 *
 * Input:  { planId, trigger, travelerState, tripContext, tripPlan }
 * Output: { primaryOption, alternatives, scoreBreakdown, explanation, processingTimeMs }
 */

import { NextResponse } from "next/server";

import type {
  ReplanTrigger,
  TravelerState,
  TripContext,
  TripPlan,
} from "@/types/replan";
import { ReplanEngine, REPLAN_TOTAL_TIMEOUT_MS } from "@/lib/services/replan/replan-engine";

// ============================================================================
// Request / Response Types
// ============================================================================

interface ReplanRequestBody {
  planId: string;
  trigger: ReplanTrigger;
  travelerState: TravelerState;
  tripContext: TripContext;
  tripPlan: TripPlan;
}

// ============================================================================
// Route Handler
// ============================================================================

export async function POST(request: Request) {
  const startTime = performance.now();

  try {
    const body = (await request.json()) as ReplanRequestBody;

    // バリデーション
    if (!body.trigger || !body.travelerState || !body.tripContext || !body.tripPlan) {
      return NextResponse.json(
        { error: "必須フィールドが不足しています" },
        { status: 400 }
      );
    }

    // 3秒タイムアウト
    const controller = new AbortController();
    const timeoutId = setTimeout(
      () => controller.abort(),
      REPLAN_TOTAL_TIMEOUT_MS
    );

    try {
      const engine = new ReplanEngine();
      const result = await engine.replan(
        body.trigger,
        body.tripPlan,
        body.travelerState,
        body.tripContext
      );

      clearTimeout(timeoutId);

      return NextResponse.json({
        primaryOption: result.primaryOption,
        alternatives: result.alternatives,
        scoreBreakdown: result.scoreBreakdown,
        explanation: result.explanation,
        processingTimeMs: result.processingTimeMs,
      });
    } catch (error) {
      clearTimeout(timeoutId);

      // タイムアウト
      if (error instanceof DOMException && error.name === "AbortError") {
        const elapsed = Math.round(performance.now() - startTime);
        return NextResponse.json(
          { error: "リプラン処理がタイムアウトしました", processingTimeMs: elapsed },
          { status: 504 }
        );
      }

      throw error;
    }
  } catch (error) {
    console.error("[replan] Error:", error);
    return NextResponse.json(
      { error: "リプラン処理中にエラーが発生しました" },
      { status: 500 }
    );
  }
}
