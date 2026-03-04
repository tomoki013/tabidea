import { GeminiService } from "@/lib/services/ai/gemini";
import { GOLDEN_PLAN_EXAMPLES } from "@/data/golden-plans/examples";
import { getUserConstraintPrompt } from "@/lib/services/plan-generation/generate-outline";
import {
  getBudgetContext,
  getFixedSchedulePrompt,
} from "@/lib/utils/plan-prompt-helpers";
import { buildConstraintsPrompt, buildTransitSchedulePrompt } from "@/lib/prompts";
import {
  createChunkTimer,
  CHUNK_TARGETS_PRO,
} from "@/lib/utils/performance-timer";
import { extractDuration, splitDaysIntoChunks } from "@/lib/utils";
import type {
  Article,
  DayPlan,
  PlanOutline,
  PlanOutlineDay,
  UserInput,
} from "@/types";

export const runtime = "nodejs";
export const maxDuration = 60;

interface DetailStreamRequestBody {
  input: UserInput;
  context: Article[];
  outline: PlanOutline;
}

interface ChunkGenerationResult {
  success: boolean;
  message?: string;
  data?: DayPlan[];
  modelInfo?: { modelName: string; tier: "flash" | "pro" };
}

async function generateChunk(
  input: UserInput,
  context: Article[],
  outlineDays: PlanOutlineDay[],
  startDay: number,
  endDay: number,
  previousOvernightLocation?: string
): Promise<ChunkGenerationResult> {
  const timer = createChunkTimer(startDay, endDay);
  const hasAIKey =
    process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.OPENAI_API_KEY;

  if (!hasAIKey) {
    return { success: false, message: "API Key missing" };
  }

  try {
    const ai = new GeminiService({
      goldenPlanExamples: GOLDEN_PLAN_EXAMPLES,
    });

    const prompt = await timer.measure("prompt_build", async () => {
      const budgetPrompt = getBudgetContext(input.budget);
      const destinationsStr = input.destinations.join("、");
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

    const days = await timer.measure("ai_generation", () =>
      ai.generateDayDetails(
        prompt,
        context,
        startDay,
        endDay,
        outlineDays,
        previousOvernightLocation
      )
    );

    if (ai.lastModelInfo?.tier === "pro") {
      timer.setTargets(CHUNK_TARGETS_PRO);
    }

    timer.log();
    return {
      success: true,
      data: days,
      modelInfo: ai.lastModelInfo || undefined,
    };
  } catch (error) {
    timer.log();
    console.error(
      `[SSE /api/generate/details/stream] Chunk generation failed (${startDay}-${endDay}):`,
      error
    );
    return { success: false, message: "詳細プランの生成に失敗しました。" };
  }
}

export async function POST(req: Request) {
  const encoder = new TextEncoder();

  let body: DetailStreamRequestBody;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid request body" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { input, context, outline } = body;

  if (!input || !context || !outline || !Array.isArray(outline.days)) {
    return new Response(JSON.stringify({ error: "Invalid request payload" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const stream = new ReadableStream({
    async start(controller) {
      const emit = (type: string, payload: Record<string, unknown>) => {
        try {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ type, ...payload })}\n\n`)
          );
        } catch {
          // Stream may already be closed
        }
      };

      try {
        let totalDays = extractDuration(input.dates);
        if (totalDays <= 0) {
          totalDays = outline.days.length;
        }

        if (totalDays <= 0) {
          emit("error", { message: "日程情報が不足しているため生成できません。" });
          controller.close();
          return;
        }

        const chunks = splitDaysIntoChunks(totalDays);
        let failedChunks = 0;

        const chunkPromises = chunks.map(async (chunk) => {
          emit("progress", { step: "chunk_start", chunk });

          const previousOvernightLocation =
            chunk.start === 1
              ? outline.destination
              : outline.days.find((d) => d.day === chunk.start - 1)
                  ?.overnight_location;

          const chunkOutlineDays = outline.days.filter(
            (d) => d.day >= chunk.start && d.day <= chunk.end
          );

          const result = await generateChunk(
            input,
            context,
            chunkOutlineDays,
            chunk.start,
            chunk.end,
            previousOvernightLocation
          );

          if (result.success && result.data) {
            emit("progress", {
              step: "chunk_complete",
              chunk,
              days: result.data,
              modelInfo: result.modelInfo,
            });
          } else {
            failedChunks += 1;
            emit("progress", {
              step: "chunk_error",
              chunk,
              message: result.message || "詳細プランの生成に失敗しました。",
            });
          }
        });

        await Promise.allSettled(chunkPromises);
        emit("complete", {
          totalChunks: chunks.length,
          failedChunks,
        });
      } catch (error) {
        console.error(
          "[SSE /api/generate/details/stream] Uncaught error:",
          error
        );
        emit("error", {
          message:
            error instanceof Error ? error.message : "予期しないエラーが発生しました",
        });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
