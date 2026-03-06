import { randomUUID } from "crypto";
import { Itinerary, UserInput, PlanOutlineDay, DayPlan, Article } from "@/types";
import { splitDaysIntoChunks } from "@/lib/utils";
import { buildConstraintsPrompt, buildTransitSchedulePrompt } from "@/lib/prompts";
import { getBudgetContext, getFixedSchedulePrompt } from "@/lib/utils/plan-prompt-helpers";
import { createChunkTimer, CHUNK_TARGETS_PRO } from "@/lib/utils/performance-timer";
import { GOLDEN_PLAN_EXAMPLES } from "@/data/golden-plans/examples";
import { GeminiService } from "@/lib/services/ai/gemini";
import { executeOutlineGeneration } from "@/lib/services/plan-generation/generate-outline";
import type { LanguageCode } from "@/lib/i18n/locales";

export interface SampleItineraryGenerationResult {
  success: boolean;
  itinerary?: Itinerary;
  error?: string;
}

function hasAvailableAiKey(): boolean {
  return Boolean(
    process.env.GOOGLE_GENERATIVE_AI_API_KEY ||
      process.env.OPENAI_API_KEY ||
      process.env.SAMPLE_GOOGLE_GENERATIVE_AI_API_KEY ||
      process.env.SAMPLE_OPENAI_API_KEY
  );
}

function buildDetailsPrompt(input: UserInput, language: LanguageCode): string {
  const budgetPrompt = getBudgetContext(input.budget);
  const destinationsStr = input.destinations.join("、");
  const isMultiCity = input.destinations.length > 1;
  const transitConstraints = buildConstraintsPrompt(input.transits);
  const transitSchedule = buildTransitSchedulePrompt(input.transits);
  const fixedSchedulePrompt = getFixedSchedulePrompt(input.fixedSchedule);
  const outputLanguageLabel = language === "en" ? "English" : "Japanese";

  return `
    Destinations: ${destinationsStr}${isMultiCity ? " (Multi-city trip)" : ""}
    Dates: ${input.dates}
    Companions: ${input.companions}
    Themes: ${input.theme.join(", ")}
    ${budgetPrompt}
    Pace: ${input.pace}
    Must-Visit: ${input.mustVisitPlaces?.join(", ") || "None"}
    Request: ${input.freeText || "None"}
    Preferred Transport: ${input.preferredTransport?.join(", ") || "None"}
    ${isMultiCity ? `Note: This is a multi-city trip visiting: ${destinationsStr}. Ensure the itinerary covers all locations.` : ""}

    ${transitSchedule}

    ${fixedSchedulePrompt}

    ${transitConstraints}

    === OUTPUT LANGUAGE (MUST FOLLOW) ===
    All user-facing itinerary text MUST be written in ${outputLanguageLabel}.
    Do not switch to other languages except for proper nouns or official place names.
  `;
}

async function generateChunk(
  ai: GeminiService,
  prompt: string,
  context: Article[],
  outlineDays: PlanOutlineDay[],
  startDay: number,
  endDay: number,
  previousOvernightLocation?: string
): Promise<DayPlan[]> {
  const timer = createChunkTimer(startDay, endDay);

  try {
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
    return days;
  } catch (error) {
    timer.log();
    throw error;
  }
}

export async function generateSampleItinerary(
  input: UserInput,
  language: LanguageCode
): Promise<SampleItineraryGenerationResult> {
  if (!hasAvailableAiKey()) {
    return { success: false, error: "api_key_missing" };
  }

  const outlineResult = await executeOutlineGeneration(input, {
    skipUsageCheck: true,
    skipCache: true,
    preferredLanguage: language,
  });

  if (!outlineResult.success || !outlineResult.data) {
    return { success: false, error: outlineResult.message || "outline_generation_failed" };
  }

  const { outline, context, input: updatedInput, heroImage } = outlineResult.data;
  const ai = new GeminiService({ goldenPlanExamples: GOLDEN_PLAN_EXAMPLES });
  const detailsPrompt = buildDetailsPrompt(updatedInput, language);
  const chunks = splitDaysIntoChunks(outline.days.length);

  try {
    const chunkPromises = chunks.map((chunk) => {
      const chunkOutlineDays = outline.days.filter(
        (day) => day.day >= chunk.start && day.day <= chunk.end
      );
      const previousOvernightLocation =
        chunk.start > 1
          ? outline.days.find((day) => day.day === chunk.start - 1)?.overnight_location
          : undefined;

      return generateChunk(
        ai,
        detailsPrompt,
        context,
        chunkOutlineDays,
        chunk.start,
        chunk.end,
        previousOvernightLocation
      );
    });

    const chunked = await Promise.all(chunkPromises);
    const days = chunked.flat().sort((a, b) => a.day - b.day);

    const itinerary: Itinerary = {
      id: randomUUID(),
      destination: outline.destination,
      description: outline.description,
      heroImage: heroImage?.url,
      heroImagePhotographer: heroImage?.photographer,
      heroImagePhotographerUrl: heroImage?.photographerUrl,
      days,
      references: context.map((article) => ({
        title: article.title,
        url: article.url,
        image: article.imageUrl,
        snippet: article.snippet,
      })),
      modelInfo: ai.lastModelInfo || undefined,
    };

    return { success: true, itinerary };
  } catch (error) {
    console.error("[sample-generation] failed to generate details:", error);
    return { success: false, error: "detail_generation_failed" };
  }
}
