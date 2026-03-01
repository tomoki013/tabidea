import { GeminiService } from "@/lib/services/ai/gemini";
import { GOLDEN_PLAN_EXAMPLES } from "@/data/golden-plans/examples";
import { getUserConstraintPrompt } from "@/lib/services/plan-generation/generate-outline";
import { getBudgetContext, getFixedSchedulePrompt } from "@/lib/utils/plan-prompt-helpers";
import { buildConstraintsPrompt, buildTransitSchedulePrompt } from "@/lib/prompts";
import { createChunkTimer, CHUNK_TARGETS_PRO } from "@/lib/utils/performance-timer";
import type { UserInput, PlanOutlineDay, Article } from "@/types";

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
  console.log(`[api/chunk] generatePlanChunk days ${startDay}-${endDay}`);

  const hasAIKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.OPENAI_API_KEY;
  if (!hasAIKey) {
    return Response.json({ success: false, message: "API Key missing" });
  }

  try {
    const ai = new GeminiService({
      goldenPlanExamples: GOLDEN_PLAN_EXAMPLES,
    });

    const prompt = await timer.measure('prompt_build', async () => {
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

    const days = await timer.measure('ai_generation', () =>
      ai.generateDayDetails(
        prompt,
        context,
        startDay,
        endDay,
        outlineDays,
        previousOvernightLocation
      )
    );

    if (ai.lastModelInfo?.tier === 'pro') {
      timer.setTargets(CHUNK_TARGETS_PRO);
    }

    timer.log();
    return Response.json({ success: true, data: days, modelInfo: ai.lastModelInfo || undefined });
  } catch (error) {
    timer.log();
    console.error(`[api/chunk] Chunk generation failed (${startDay}-${endDay}):`, error);
    return Response.json({ success: false, message: "詳細プランの生成に失敗しました。" });
  }
}
