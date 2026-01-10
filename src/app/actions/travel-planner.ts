"use server";

import { GeminiService } from "@/lib/ai/gemini";
// import { WebScraperRetriever } from '@/lib/rag/scraper';
import { PineconeRetriever } from "@/lib/rag/pinecone-retriever";
import { Itinerary, UserInput } from "@/lib/types";
import { getUnsplashImage } from "@/lib/unsplash";

export type ActionState = {
  success: boolean;
  message?: string;
  data?: Itinerary;
};

/**
 * Extract duration (number of days) from dates string
 */
function extractDuration(dates: string): number {
  const match = dates.match(/(\d+)日間/);
  return match ? parseInt(match[1]) : 0;
}

/**
 * Split days into chunks of maximum 2 days each to avoid timeouts
 */
function splitDaysIntoChunks(totalDays: number): { start: number; end: number }[] {
  const chunks: { start: number; end: number }[] = [];
  let currentDay = 1;
  const CHUNK_SIZE = 2; // Reduced to 2 days to prevent timeouts on long trips

  while (currentDay <= totalDays) {
    const end = Math.min(currentDay + CHUNK_SIZE - 1, totalDays);
    chunks.push({ start: currentDay, end });
    currentDay = end + 1;
  }

  return chunks;
}

export async function generatePlan(input: UserInput): Promise<ActionState> {
  const startTime = Date.now();
  console.log(`[action] generatePlan started at ${new Date().toISOString()}`);
  console.log(`[action] Input: ${JSON.stringify(input)}`);

  const apiKey = process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    console.error("[action] API Key is missing in environment variables");
    return {
      success: false,
      message: "システムエラー: APIキーが設定されていません。管理者に連絡してください。",
    };
  }

  try {
    const scraper = new PineconeRetriever();
    const ai = new GeminiService(apiKey);

    // 1. RAG: Search for relevant content
    // Generate semantic query for better vector search results
    const query = input.isDestinationDecided
      ? `${input.destination}で${input.companions}と${input.theme.join("や")}を楽しむ旅行`
      : `${input.region === "domestic" ? "日本国内" : input.region === "overseas" ? "海外" : "おすすめの場所"}で${input.travelVibe ? input.travelVibe + "な" : ""}${input.theme.join("や")}を楽しむ${input.companions}旅行`;
    console.log(`[action] Step 1: Searching for "${query}"`);

    let contextArticles: any[] = [];
    try {
        // Minimize RAG to just 1 article for maximum speed
        contextArticles = await scraper.search(query, { topK: 1 });
        console.log(
        `[action] Step 1 Complete. Found ${
            contextArticles.length
        } articles. Elapsed: ${Date.now() - startTime}ms`
        );
    } catch (e) {
        console.warn("[action] Vector search failed, proceeding without context:", e);
        contextArticles = [];
    }

    // 2. AI: Generate Plan
    console.log(`[action] Step 2: Generating Plan with AI...`);

    // Extract duration and check if we need to split
    const totalDays = extractDuration(input.dates);
    const shouldSplit = totalDays > 1; // Split aggressively for all trips over 1 day

    let plan: Itinerary;

    if (shouldSplit) {
      console.log(`[action] Duration is ${totalDays} days. Splitting into 2-day chunks...`);
      const chunks = splitDaysIntoChunks(totalDays);
      console.log(`[action] Created ${chunks.length} chunks:`, chunks);

      // Generate plan for each chunk with aggressive parallel processing
      const chunkPlans: Itinerary[] = [];
      const BATCH_SIZE = 5; // Process 5 chunks at a time for maximum speed

      for (let batchStart = 0; batchStart < chunks.length; batchStart += BATCH_SIZE) {
        const batchEnd = Math.min(batchStart + BATCH_SIZE, chunks.length);
        const batchChunks = chunks.slice(batchStart, batchEnd);

        console.log(`[action] Processing batch ${Math.floor(batchStart / BATCH_SIZE) + 1}/${Math.ceil(chunks.length / BATCH_SIZE)} (${batchChunks.length} chunks)...`);

        const batchPromises = batchChunks.map(async (chunk, batchIndex) => {
          const i = batchStart + batchIndex;
          console.log(`[action] Generating chunk ${i + 1}/${chunks.length} (days ${chunk.start}-${chunk.end})...`);

          let prompt = "";
          if (input.isDestinationDecided) {
            prompt = `
              Destination: ${input.destination}
              Dates: ${input.dates}
              Total Trip Duration: ${totalDays} days (${totalDays - 1} nights)
              Companions: ${input.companions}
              Themes: ${input.theme.join(", ")}
              Budget: ${input.budget || "Not specified"}
              Pace: ${input.pace || "Not specified"}
              Must-Visit Places: ${input.mustVisitPlaces?.join(", ") || "None"}
              Specific Requests: ${input.freeText || "None"}

              IMPORTANT: This is part ${i + 1} of ${chunks.length} of a multi-part itinerary for a ${totalDays}-day trip.
              Please create a travel itinerary ONLY for days ${chunk.start} to ${chunk.end} (${chunk.end - chunk.start + 1} days).
              ${i === 0 ? `This is the beginning of the trip. In the "description" field, write an overview of the ENTIRE ${totalDays}-day trip.` : i === chunks.length - 1 ? "This is the end of the trip." : "This is a middle section of the trip."}
            `;
          } else {
            prompt = `
              User has NOT decided on a specific destination yet.
              Preferred Region: ${input.region === "domestic" ? "Japan (Domestic)" : input.region === "overseas" ? "Overseas (International)" : "Anywhere"}
              Travel Vibe/Preference: ${input.travelVibe || "None specified"}
              Dates: ${input.dates}
              Total Trip Duration: ${totalDays} days (${totalDays - 1} nights)
              Companions: ${input.companions}
              Themes: ${input.theme.join(", ")}
              Budget: ${input.budget || "Not specified"}
              Pace: ${input.pace || "Not specified"}
              Must-Visit Places: ${input.mustVisitPlaces?.join(", ") || "None"}
              Specific Requests: ${input.freeText || "None"}

              Task:
              1. Select the BEST single destination that matches the user's themes, budget, region preference, and specifically their Vibe/Preference ("${input.travelVibe}").
              2. Create a detailed travel itinerary for that chosen destination.
              3. The "destination" field in the JSON must be the name of the place you chose.

              IMPORTANT: This is part ${i + 1} of ${chunks.length} of a multi-part itinerary for a ${totalDays}-day trip.
              Please create a travel itinerary ONLY for days ${chunk.start} to ${chunk.end} (${chunk.end - chunk.start + 1} days).
              ${i === 0 ? `This is the beginning of the trip. In the "description" field, write an overview of the ENTIRE ${totalDays}-day trip.` : i === chunks.length - 1 ? "This is the end of the trip." : "This is a middle section of the trip."}
            `;
          }

          return await ai.generateItinerary(prompt, contextArticles, chunk.start, chunk.end);
        });

        const batchResults = await Promise.all(batchPromises);
        chunkPlans.push(...batchResults);
      }

      console.log(`[action] All chunks generated. Merging results...`);

      // Merge all chunk plans into one, normalizing day numbers
      const mergedDays = chunkPlans.flatMap((chunkPlan, chunkIndex) => {
        const chunk = chunks[chunkIndex];
        return chunkPlan.days.map((day, index) => ({
          ...day,
          // Ensure day numbers are correct based on chunk position
          day: chunk.start + index,
        }));
      });

      plan = {
        id: chunkPlans[0].id,
        destination: chunkPlans[0].destination,
        description: chunkPlans[0].description,
        reasoning: chunkPlans[0].reasoning,
        heroImage: chunkPlans[0].heroImage,
        days: mergedDays,
        references: [],
      };

      // Merge references and deduplicate by URL
      const referenceMap = new Map<string, any>();
      chunkPlans.forEach(p => {
        (p.references || []).forEach(ref => {
          if (!referenceMap.has(ref.url)) {
            referenceMap.set(ref.url, ref);
          }
        });
      });
      plan.references = Array.from(referenceMap.values());

    } else {
      // Original behavior for single day trips only
      console.log(`[action] Duration is ${totalDays} day(s) (≤1). Generating single plan...`);

      let prompt = "";
      if (input.isDestinationDecided) {
        prompt = `
          Destination: ${input.destination}
          Dates: ${input.dates}
          Companions: ${input.companions}
          Themes: ${input.theme.join(", ")}
          Budget: ${input.budget || "Not specified"}
          Pace: ${input.pace || "Not specified"}
          Must-Visit Places: ${input.mustVisitPlaces?.join(", ") || "None"}
          Specific Requests: ${input.freeText || "None"}

          Please create a travel itinerary for this request.
        `;
      } else {
        prompt = `
          User has NOT decided on a specific destination yet.
          Preferred Region: ${input.region === "domestic" ? "Japan (Domestic)" : input.region === "overseas" ? "Overseas (International)" : "Anywhere"}
          Travel Vibe/Preference: ${input.travelVibe || "None specified"}
          Dates: ${input.dates}
          Companions: ${input.companions}
          Themes: ${input.theme.join(", ")}
          Budget: ${input.budget || "Not specified"}
          Pace: ${input.pace || "Not specified"}
          Must-Visit Places: ${input.mustVisitPlaces?.join(", ") || "None"}
          Specific Requests: ${input.freeText || "None"}

          Task:
          1. Select the BEST single destination that matches the user's themes, budget, region preference, and specifically their Vibe/Preference ("${input.travelVibe}").
          2. Create a detailed travel itinerary for that chosen destination.
          3. The "destination" field in the JSON must be the name of the place you chose.
        `;
      }

      plan = await ai.generateItinerary(prompt, contextArticles);
    }

    // Fetch hero image from Unsplash
    const heroImageData = await getUnsplashImage(plan.destination);
    if (heroImageData) {
      plan.heroImage = heroImageData.url;
      plan.heroImagePhotographer = heroImageData.photographer;
      plan.heroImagePhotographerUrl = heroImageData.photographerUrl;
    }

    console.log(
      `[action] Step 2 Complete. Plan ID: ${plan.id}. Total Elapsed: ${
        Date.now() - startTime
      }ms`
    );

    return { success: true, data: plan };
  } catch (error: any) {
    console.error("[action] Plan generation failed:", error);
    const elapsed = Date.now() - startTime;

    let userMessage = "プランの生成中にエラーが発生しました。もう一度お試しください。";

    // Check for specific error types (e.g., from Gemini)
    if (error.message?.includes("Candidate was blocked due to safety")) {
        userMessage = "生成されたプランが安全基準に抵触したため表示できません。入力内容（フリーテキストなど）を変更して再度お試しください。";
    } else if (error.message?.includes("429") || error.message?.includes("quota")) {
        userMessage = "アクセスが集中しており、現在プランを生成できません。しばらく時間を置いてから再度お試しください。";
    } else if (error.message?.includes("JSON")) {
        userMessage = "AIからの応答の解析に失敗しました。もう一度お試しください。";
    }

    return {
      success: false,
      message: userMessage,
    };
  }
}

export async function chatWithPlanner(
  history: Itinerary,
  userMessage: string
): Promise<{ response: string }> {
  const apiKey = process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    return { response: "System Error: API Key missing" };
  }

  try {
    const ai = new GeminiService(apiKey);
    const reply = await ai.chat(userMessage, history);
    return { response: reply };
  } catch (e) {
    console.error(e);
    return { response: "すみません、エラーが発生しました。もう一度お試しください。" };
  }
}

export async function fetchHeroImage(
  destination: string
) {
  try {
    const heroImageData = await getUnsplashImage(destination);
    return heroImageData;
  } catch (e) {
    console.error("Failed to fetch hero image:", e);
    return null;
  }
}

export async function regeneratePlan(
  currentPlan: Itinerary,
  chatHistory: { role: string; text: string }[]
): Promise<ActionState> {
  const apiKey = process.env.GOOGLE_API_KEY;
  if (!apiKey) return { success: false, message: "API Key missing" };

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

    return { success: true, data: newPlan };
  } catch (e) {
    console.error("Regeneration failed", e);
    return { success: false, message: "プランの再生成に失敗しました。" };
  }
}
