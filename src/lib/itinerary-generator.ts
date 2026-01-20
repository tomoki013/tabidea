/**
 * 旅程生成サービス
 *
 * UserInputから旅程（Itinerary）を生成するための再利用可能なモジュール
 */

import { GeminiService } from "./ai/gemini";
import { PineconeRetriever } from "./rag/pinecone-retriever";
import { getUnsplashImage } from "./unsplash";
import { extractDuration, splitDaysIntoChunks } from "./planUtils";
import { Itinerary, DayPlan, UserInput, Article } from "@/types";

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
    const ai = new GeminiService(apiKey);

    // 1. RAG Search
    const query = input.isDestinationDecided
      ? `${input.destination}で${input.companions}と${input.theme.join(
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

    let prompt: string;
    if (input.isDestinationDecided) {
      prompt = `
        Destination: ${input.destination}
        Dates: ${input.dates}
        Total Days: ${totalDays}
        Companions: ${input.companions}
        Themes: ${input.theme.join(", ")}
        Budget: ${input.budget}
        Pace: ${input.pace}
        Must-Visit: ${input.mustVisitPlaces?.join(", ") || "None"}
        Note: ${input.freeText || "None"}
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
      updatedInput.destination = outline.destination;
      updatedInput.isDestinationDecided = true;
    }

    // 5. Generate Chunks in parallel
    const chunks = splitDaysIntoChunks(totalDays);
    log(`[generateItinerary] Generating ${chunks.length} chunk(s)...`);

    const chunkPromises = chunks.map((chunk) => {
      const chunkOutlineDays = outline.days.filter(
        (d) => d.day >= chunk.start && d.day <= chunk.end
      );
      return ai.generateDayDetails(
        prompt,
        contextArticles,
        chunk.start,
        chunk.end,
        chunkOutlineDays
      );
    });

    const chunkResults = await Promise.all(chunkPromises);

    // Merge results
    const mergedDays: DayPlan[] = chunkResults.flat();
    mergedDays.sort((a, b) => a.day - b.day);

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
    const ai = new GeminiService(apiKey);
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
