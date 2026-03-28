/**
 * POST /api/replan — リプラン API エンドポイント
 *
 * 旅行中の状況変化に応じて代替プランを提案する。
 * 3秒以内にレスポンスを返却する（AbortSignal で強制終了）。
 *
 * Input:  { planId, trigger, travelerState, tripContext, tripPlan }
 * Output: shared PlanMutationResult<ReplanResult>
 */

import { NextResponse } from "next/server";

import type {
  ReplanTrigger,
  TravelerState,
  TripContext,
  TripPlan,
} from "@/types/replan";
import { REPLAN_TOTAL_TIMEOUT_MS } from "@/lib/services/replan/replan-engine";
import { EventLogger } from "@/lib/services/analytics/event-logger";
import { replanPlan } from "@/lib/services/plan-mutation";
import { createClient } from "@/lib/supabase/server";

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
        { error: "missing_required_fields" },
        { status: 400 }
      );
    }

    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(new DOMException("Aborted", "AbortError"));
      }, REPLAN_TOTAL_TIMEOUT_MS);
    });

    try {
      const result = await Promise.race([
        replanPlan({
          trigger: body.trigger,
          tripPlan: body.tripPlan,
          travelerState: body.travelerState,
          tripContext: body.tripContext,
        }),
        timeoutPromise,
      ]);

      if (!result.ok) {
        const status = result.error === "replan_timeout" ? 504 : 500;
        return NextResponse.json(result, { status });
      }

      // イベント記録 (fire-and-forget)
      createClient().then((supabase) => {
        const logger = new EventLogger(supabase);
        logger.logReplan({
          planId: body.planId,
          triggerType: body.trigger.type,
          humanResolutionScore: result.data.scoreBreakdown.total,
          processingTimeMs: result.data.processingTimeMs,
        });
      }).catch(() => { /* fail-open */ });

      return NextResponse.json(result);
    } catch (error) {
      // タイムアウト
      if (error instanceof DOMException && error.name === "AbortError") {
        const elapsed = Math.round(performance.now() - startTime);
        return NextResponse.json(
          {
            ok: false,
            error: "replan_timeout",
            meta: {
              mutationType: "replan",
              durationMs: elapsed,
              warnings: [],
            },
          },
          { status: 504 }
        );
      }

      throw error;
    }
  } catch (error) {
    console.error("[replan] Error:", error);
    return NextResponse.json(
      {
        ok: false,
        error: "replan_failed",
        meta: {
          mutationType: "replan",
          durationMs: Math.round(performance.now() - startTime),
          warnings: [],
        },
      },
      { status: 500 }
    );
  }
}
