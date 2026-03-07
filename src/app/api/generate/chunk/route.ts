import { GeminiService, normalizeDayPlan } from "@/lib/services/ai/gemini";
import { getUserConstraintPrompt } from "@/lib/services/plan-generation/generate-outline";
import { getBudgetContext, getFixedSchedulePrompt } from "@/lib/utils/plan-prompt-helpers";
import { buildConstraintsPrompt, buildTransitSchedulePrompt } from "@/lib/prompts";
import { createChunkTimer, CHUNK_TARGETS_PRO } from "@/lib/utils/performance-timer";
import type { UserInput, PlanOutlineDay, Article } from "@/types";
import type { DayPlanInput } from "@/lib/services/ai/schemas/itinerary-schemas";

export const runtime = "nodejs";
export const maxDuration = 60;

interface ChunkRequestBody {
  input: UserInput;
  context: Article[];
  outlineDays: PlanOutlineDay[];
  startDay: number;
  endDay: number;
  previousOvernightLocation?: string;
}

export async function POST(req: Request) {
  let body: ChunkRequestBody;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ success: false, message: "Invalid request body" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { input, context, outlineDays, startDay, endDay, previousOvernightLocation } = body;
  const timer = createChunkTimer(startDay, endDay);
  console.log(`[api/chunk] streamDayDetails day ${startDay}`);

  const hasAIKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.OPENAI_API_KEY;
  if (!hasAIKey) {
    return new Response(JSON.stringify({ success: false, message: "API Key missing" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  // プロンプトを先に構築（ストリーム外で await 可能）
  let prompt: string;
  try {
    prompt = await timer.measure('prompt_build', async () => {
      const budgetPrompt = getBudgetContext(input.budget);
      const destinationsStr = input.destinations.join("\u3001");
      const isMultiCity = input.destinations.length > 1;
      const userConstraintPrompt = await getUserConstraintPrompt();
      const transitConstraints = buildConstraintsPrompt(input.transits);
      const transitSchedule = buildTransitSchedulePrompt(input.transits);
      const fixedSchedulePrompt = getFixedSchedulePrompt(input.fixedSchedule);

      return `
        Destinations: ${destinationsStr}${isMultiCity ? " (Multi-city trip)" : ""}
        Dates: ${input.dates}
        Companions: ${input.companions}
        Themes: ${input.theme.join(", ")}
        ${budgetPrompt}
        Pace: ${input.pace}
        Must-Visit: ${input.mustVisitPlaces?.join(", ") || "None"}
        Request: ${input.freeText || "None"}
        ${isMultiCity ? `Note: This is a multi-city trip visiting: ${destinationsStr}. Ensure the itinerary covers all locations.` : ""}

        ${transitSchedule}

        ${fixedSchedulePrompt}

        ${userConstraintPrompt}

        ${transitConstraints}
      `;
    });
  } catch (err) {
    console.error(`[api/chunk] Prompt build failed:`, err);
    return new Response(JSON.stringify({ success: false, message: "prompt_build_failed" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  const ai = new GeminiService();
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const emit = (type: string, data: Record<string, unknown>) => {
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ type, ...data })}\n\n`)
        );
      };

      try {
        const generator = ai.streamDayDetails(
          prompt,
          context,
          startDay,
          outlineDays,
          previousOvernightLocation
        );

        let lastPartial: unknown = null;

        timer.measure('ai_generation', async () => {
          // 計測はストリームと別で行う（ここでは開始時刻だけ記録）
        }).catch(() => {/* ignore */});

        const aiStart = Date.now();
        for await (const partial of generator) {
          lastPartial = partial;
          emit('partial', { day: startDay, data: partial });
        }
        console.log(`[api/chunk] Day ${startDay} stream completed in ${Date.now() - aiStart}ms`);

        // 完了後: 正規化して complete emit
        if (lastPartial) {
          const normalized = normalizeDayPlan(lastPartial as DayPlanInput);
          emit('complete', { day: startDay, data: normalized });

          if (ai.lastModelInfo?.tier === 'pro') {
            timer.setTargets(CHUNK_TARGETS_PRO);
          }
          timer.log();
        } else {
          emit('error', { day: startDay, message: 'detail_generation_failed' });
        }
      } catch (error) {
        console.error(`[api/chunk] Stream error for day ${startDay}:`, error);
        emit('error', { day: startDay, message: 'chunk_generation_failed' });
        timer.log();
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
