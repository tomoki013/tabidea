/**
 * 旅程生成サービス
 *
 * UserInputから旅程（Itinerary）を生成するための再利用可能なモジュール
 */

import { GeminiService } from "./services/ai/gemini";
import { createAIService } from "./services/ai/factory";
import { PineconeRetriever } from "./services/rag/pinecone-retriever";
import { getUnsplashImage } from "./unsplash";
import { extractDuration, splitDaysIntoChunks } from "./utils/plan";
import { buildConstraintsPrompt, buildTransitSchedulePrompt } from "@/lib/prompts";
import { Itinerary, DayPlan, UserInput, Article, TransitType } from "@/types";
import { GOLDEN_PLAN_EXAMPLES } from "@/data/golden-plans/examples";

/**
 * Infer transit type from travel method description
 */
function inferTransitType(travelMethod: string): TransitType {
  const method = travelMethod.toLowerCase();

  if (method.includes("飛行機") || method.includes("flight") || method.includes("fly")) {
    return "flight";
  }
  if (method.includes("新幹線") || method.includes("電車") || method.includes("train") || method.includes("鉄道")) {
    return "train";
  }
  if (method.includes("バス") || method.includes("bus")) {
    return "bus";
  }
  if (method.includes("船") || method.includes("フェリー") || method.includes("ship") || method.includes("ferry")) {
    return "ship";
  }
  if (method.includes("車") || method.includes("レンタカー") || method.includes("car") || method.includes("drive")) {
    return "car";
  }

  return "other";
}

/**
 * Calculate approximate duration based on transit type
 */
function calculateApproximateDuration(transitType: TransitType): string {
  switch (transitType) {
    case "flight":
      return "2-3時間";
    case "train":
      return "2-4時間";
    case "bus":
      return "3-5時間";
    case "ship":
      return "4-6時間";
    case "car":
      return "3-4時間";
    default:
      return "2-3時間";
  }
}

export interface ItineraryGenerationOptions {
  /** RAG検索で取得する記事の数 */
  topK?: number;
  /** ヒーロー画像を取得するかどうか */
  fetchHeroImage?: boolean;
  /** 生成の進捗をログ出力するかどうか */
  verbose?: boolean;
}

export interface ItineraryGenerationResult {
  success: boolean;
  itinerary?: Itinerary;
  error?: string;
}

/**
 * UserInputから旅程を生成する
 *
 * @param input ユーザー入力
 * @param options 生成オプション
 * @returns 生成結果
 *
 * @example
 * ```typescript
 * const result = await generateItinerary({
 *   destination: "札幌・小樽",
 *   dates: "2泊3日",
 *   companions: "家族（子供あり）",
 *   theme: ["グルメ", "自然・絶景"],
 *   budget: "中程度",
 *   pace: "ゆっくり",
 *   region: "domestic",
 *   freeText: "",
 * });
 *
 * if (result.success) {
 *   console.log(result.itinerary);
 * }
 * ```
 */
export async function generateItinerary(
  input: UserInput,
  options: ItineraryGenerationOptions = {}
): Promise<ItineraryGenerationResult> {
  const { topK = 1, fetchHeroImage = true, verbose = false } = options;

  const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  if (!apiKey) {
    return { success: false, error: "GOOGLE_GENERATIVE_AI_API_KEY is not set" };
  }

  const log = verbose ? console.log : () => {};

  try {
    const scraper = new PineconeRetriever();
    const ai = createAIService({
      apiKey,
      geminiOptions: { goldenPlanExamples: GOLDEN_PLAN_EXAMPLES },
    });

    // 1. RAG Search
    const destinationsStr = input.destinations.join("、");
    const query = input.isDestinationDecided
      ? `${destinationsStr}で${input.companions}と${input.theme.join(
          "や"
        )}を楽しむ旅行`
      : `${
          input.region === "domestic"
            ? "日本国内"
            : input.region === "overseas"
            ? "海外"
            : "おすすめの場所"
        }で${input.travelVibe ? input.travelVibe + "な" : ""}${input.theme.join(
          "や"
        )}を楽しむ${input.companions}旅行`;

    log(`[generateItinerary] RAG Query: ${query}`);

    let contextArticles: Article[] = [];
    try {
      contextArticles = await scraper.search(query, { topK });
      log(
        `[generateItinerary] Found ${contextArticles.length} reference articles`
      );
    } catch (e) {
      log(`[generateItinerary] Vector search failed:`, e);
    }

    // 2. Prepare Prompt
    const totalDays = extractDuration(input.dates);
    log(`[generateItinerary] Total days: ${totalDays}`);

    // Enhanced Transit Constraints
    const transitConstraints = buildConstraintsPrompt(input.transits);
    const transitSchedule = buildTransitSchedulePrompt(input.transits);

    let prompt: string;
    const isMultiCity = input.destinations.length > 1;
    if (input.isDestinationDecided) {
      prompt = `
        Destinations: ${destinationsStr}${
        isMultiCity ? " (Multi-city trip)" : ""
      }
        Dates: ${input.dates}
        Total Days: ${totalDays}
        Companions: ${input.companions}
        Themes: ${input.theme.join(", ")}
        Budget: ${input.budget}
        Pace: ${input.pace}
        Must-Visit: ${input.mustVisitPlaces?.join(", ") || "None"}
        Note: ${input.freeText || "None"}

        ${transitSchedule}
        ${transitConstraints}

        ${
          isMultiCity
            ? `IMPORTANT: This is a multi-city trip visiting: ${destinationsStr}. Plan the route efficiently.`
            : ""
        }
      `;
    } else {
      prompt = `
        Region: ${
          input.region === "domestic"
            ? "Japan"
            : input.region === "overseas"
            ? "Overseas"
            : "Anywhere"
        }
        Vibe: ${input.travelVibe || "None"}
        Dates: ${input.dates}
        Total Days: ${totalDays}
        Companions: ${input.companions}
        Themes: ${input.theme.join(", ")}
        Budget: ${input.budget}
        Pace: ${input.pace}
        Must-Visit: ${input.mustVisitPlaces?.join(", ") || "None"}
        Note: ${input.freeText || "None"}

        ${transitSchedule}
        ${transitConstraints}

        TASK: Select best destination and outline plan.
      `;
    }

    // 3. Generate Outline
    log(`[generateItinerary] Generating outline...`);
    const outline = await ai.generateOutline(prompt, contextArticles);
    log(`[generateItinerary] Outline generated: ${outline.destination}`);

    // 4. Update Input if destination was chosen
    const updatedInput = { ...input };
    if (!updatedInput.isDestinationDecided) {
      updatedInput.destinations = [outline.destination];
      updatedInput.isDestinationDecided = true;
    }

    // 5. Generate Chunks in parallel
    // Each chunk receives the starting location from the outline's previous day's overnight_location
    // This ensures geographic continuity even with parallel processing
    const chunks = splitDaysIntoChunks(totalDays);
    log(`[generateItinerary] Generating ${chunks.length} chunk(s)...`);

    const chunkPromises = chunks.map((chunk) => {
      const chunkOutlineDays = outline.days.filter(
        (d) => d.day >= chunk.start && d.day <= chunk.end
      );

      // Determine starting location for this chunk
      // If this chunk starts on day 1, no starting location constraint
      // Otherwise, use the overnight_location from the previous day in the outline
      let startingLocation: string | undefined;
      if (chunk.start > 1) {
        const previousDay = outline.days.find((d) => d.day === chunk.start - 1);
        if (previousDay?.overnight_location) {
          startingLocation = previousDay.overnight_location;
          log(
            `[generateItinerary] Chunk starting Day ${chunk.start} will begin at: ${startingLocation}`
          );
        }
      }

      return ai.generateDayDetails(
        prompt,
        contextArticles,
        chunk.start,
        chunk.end,
        chunkOutlineDays,
        startingLocation
      );
    });

    const chunkResults = await Promise.all(chunkPromises);

    // Merge results
    const mergedDays: DayPlan[] = chunkResults.flat();
    mergedDays.sort((a, b) => a.day - b.day);

    // Auto-generate transit from outline if AI didn't generate it
    mergedDays.forEach((dayPlan, index) => {
      // If AI already generated transit, keep it
      if (dayPlan.transit) {
        return;
      }

      // Check if there's travel from previous day
      if (index > 0) {
        const previousOutlineDay = outline.days.find((d) => d.day === dayPlan.day - 1);
        if (previousOutlineDay?.travel_method_to_next) {
          const currentOutlineDay = outline.days.find((d) => d.day === dayPlan.day);

          // Infer transit type from travel_method_to_next
          const transitType = inferTransitType(previousOutlineDay.travel_method_to_next);

          dayPlan.transit = {
            type: transitType,
            departure: {
              place: previousOutlineDay.overnight_location,
              time: "09:00", // Default departure time
            },
            arrival: {
              place: currentOutlineDay?.overnight_location || dayPlan.title,
              time: "12:00", // Default arrival time
            },
            duration: calculateApproximateDuration(transitType),
            memo: previousOutlineDay.travel_method_to_next,
          };

          log(`[generateItinerary] Auto-generated transit for Day ${dayPlan.day}: ${transitType}`);
        }
      }
    });

    // Inject user transit info (overrides auto-generated or AI-generated)
    if (input.transits) {
      mergedDays.forEach((dayPlan) => {
        const transit = input.transits![dayPlan.day];
        if (transit) {
          dayPlan.transit = transit;
        }
      });
    }

    // 6. Fetch Hero Image (optional)
    let heroImageData = null;
    if (fetchHeroImage) {
      log(`[generateItinerary] Fetching hero image...`);
      heroImageData = await getUnsplashImage(outline.destination);
    }

    // 7. Construct Final Itinerary
    const simpleId = Math.random().toString(36).substring(2, 15);

    const finalItinerary: Itinerary = {
      id: simpleId,
      destination: outline.destination,
      description: outline.description,
      heroImage: heroImageData?.url || undefined,
      heroImagePhotographer: heroImageData?.photographer || undefined,
      heroImagePhotographerUrl: heroImageData?.photographerUrl || undefined,
      days: mergedDays,
      references: contextArticles.map((c) => ({
        title: c.title,
        url: c.url,
        image: c.imageUrl,
        snippet: c.snippet,
      })),
      modelInfo: ai.lastModelInfo || undefined,
    };

    log(`[generateItinerary] ✅ Itinerary generated successfully!`);
    log(`[generateItinerary]    - ${finalItinerary.days.length} days`);
    log(
      `[generateItinerary]    - ${finalItinerary.days.reduce(
        (sum, d) => sum + d.activities.length,
        0
      )} total activities`
    );

    return { success: true, itinerary: finalItinerary };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`[generateItinerary] Error:`, error);
    return { success: false, error: errorMessage };
  }
}

/**
 * 既存の旅程を再生成する（チャット履歴を使用）
 *
 * @param currentPlan 現在の旅程
 * @param chatHistory チャット履歴
 * @returns 生成結果
 */
export async function regenerateItinerary(
  currentPlan: Itinerary,
  chatHistory: { role: string; text: string }[]
): Promise<ItineraryGenerationResult> {
  const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  if (!apiKey) {
    return { success: false, error: "GOOGLE_GENERATIVE_AI_API_KEY is not set" };
  }

  try {
    const ai = createAIService({ apiKey });
    const newPlan = await ai.modifyItinerary(currentPlan, chatHistory);

    // If the destination changed, fetch a new image
    if (newPlan.destination !== currentPlan.destination) {
      const heroImageData = await getUnsplashImage(newPlan.destination);
      if (heroImageData) {
        newPlan.heroImage = heroImageData.url;
        newPlan.heroImagePhotographer = heroImageData.photographer;
        newPlan.heroImagePhotographerUrl = heroImageData.photographerUrl;
      }
    } else {
      // Keep the old image if destination is the same
      newPlan.heroImage = currentPlan.heroImage;
      newPlan.heroImagePhotographer = currentPlan.heroImagePhotographer;
      newPlan.heroImagePhotographerUrl = currentPlan.heroImagePhotographerUrl;
    }

    return { success: true, itinerary: newPlan };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`[regenerateItinerary] Error:`, error);
    return { success: false, error: errorMessage };
  }
}
