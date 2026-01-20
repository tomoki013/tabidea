"use server";

import { GeminiService } from "@/lib/ai/gemini";
// import { WebScraperRetriever } from '@/lib/rag/scraper';
import { PineconeRetriever } from "@/lib/rag/pinecone-retriever";
import { Itinerary, UserInput, PlanOutline, PlanOutlineDay, DayPlan, Article } from '@/types';
import { getUnsplashImage } from "@/lib/unsplash";
import { extractDuration, splitDaysIntoChunks } from "@/lib/planUtils";

export type ActionState = {
  success: boolean;
  message?: string;
  data?: Itinerary;
};

export type OutlineActionState = {
  success: boolean;
  message?: string;
  data?: {
    outline: PlanOutline;
    context: Article[];
    input: UserInput;
    heroImage?: any;
  };
};

export type ChunkActionState = {
  success: boolean;
  message?: string;
  data?: DayPlan[];
};

/**
 * Step 1: Generate Master Outline (Client-Side Orchestration Flow)
 */
export async function generatePlanOutline(input: UserInput): Promise<OutlineActionState> {
  const startTime = Date.now();
  console.log(`[action] generatePlanOutline started`);

  const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  if (!apiKey) {
    return { success: false, message: "API Key missing" };
  }

  try {
    const scraper = new PineconeRetriever();
    const ai = new GeminiService(apiKey);

    // 1. RAG Search
    const query = input.isDestinationDecided
      ? `${input.destination}で${input.companions}と${input.theme.join("や")}を楽しむ旅行`
      : `${input.region === "domestic" ? "日本国内" : input.region === "overseas" ? "海外" : "おすすめの場所"}で${input.travelVibe ? input.travelVibe + "な" : ""}${input.theme.join("や")}を楽しむ${input.companions}旅行`;

    let contextArticles: any[] = [];
    try {
        contextArticles = await scraper.search(query, { topK: 1 });
    } catch (e) {
        console.warn("[action] Vector search failed:", e);
    }

    // 2. Prepare Prompt
    let prompt = "";
    const totalDays = extractDuration(input.dates);
    const durationPrompt = totalDays > 0 ? `${totalDays}` : "Flexible (Suggest suitable duration, e.g. 2-5 days)";

    if (input.isDestinationDecided) {
      prompt = `
        Destination: ${input.destination}
        Dates: ${input.dates}
        Total Days: ${durationPrompt}
        Companions: ${input.companions}
        Themes: ${input.theme.join(", ")}
        Budget: ${input.budget}
        Pace: ${input.pace}
        Must-Visit: ${input.mustVisitPlaces?.join(", ") || "None"}
        Note: ${input.freeText || "None"}
      `;
    } else {
      prompt = `
        Region: ${input.region === "domestic" ? "Japan (Domestic)" : input.region === "overseas" ? "Overseas (International - NOT Japan)" : "Anywhere"}
        Vibe: ${input.travelVibe || "None"}
        Dates: ${input.dates}
        Total Days: ${durationPrompt}
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
    const outline = await ai.generateOutline(prompt, contextArticles);

    // 4. Update Input if destination was chosen
    const updatedInput = { ...input };
    if (!updatedInput.isDestinationDecided) {
      updatedInput.destination = outline.destination;
      updatedInput.isDestinationDecided = true;
    }

    // 5. Fetch Hero Image early
    const heroImageData = await getUnsplashImage(outline.destination);

    console.log(`[action] Outline generated in ${Date.now() - startTime}ms`);

    return {
      success: true,
      data: {
        outline,
        context: contextArticles,
        input: updatedInput,
        heroImage: heroImageData
      }
    };

  } catch (error: any) {
    console.error("[action] Outline generation failed:", error);
    return { success: false, message: "プラン概要の作成に失敗しました。" };
  }
}

/**
 * Step 2: Generate Details for a specific Chunk (Client-Side Orchestration Flow)
 */
export async function generatePlanChunk(
  input: UserInput,
  context: Article[],
  outlineDays: PlanOutlineDay[],
  startDay: number,
  endDay: number
): Promise<ChunkActionState> {
  const startTime = Date.now();
  console.log(`[action] generatePlanChunk days ${startDay}-${endDay}`);

  const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  if (!apiKey) return { success: false, message: "API Key missing" };

  try {
    const ai = new GeminiService(apiKey);

    const prompt = `
      Destination: ${input.destination}
      Dates: ${input.dates}
      Companions: ${input.companions}
      Themes: ${input.theme.join(", ")}
      Budget: ${input.budget}
      Pace: ${input.pace}
      Must-Visit: ${input.mustVisitPlaces?.join(", ") || "None"}
      Request: ${input.freeText || "None"}
    `;

    const days = await ai.generateDayDetails(prompt, context, startDay, endDay, outlineDays);

    console.log(`[action] Chunk ${startDay}-${endDay} generated in ${Date.now() - startTime}ms`);
    return { success: true, data: days };

  } catch (error: any) {
    console.error(`[action] Chunk generation failed (${startDay}-${endDay}):`, error);
    return { success: false, message: "詳細プランの生成に失敗しました。" };
  }
}


/**
 * Legacy Function - Kept for reference or fallback if needed, but primary flow uses Outline+Chunks now.
 */
export async function generatePlan(input: UserInput): Promise<ActionState> {
    // Forwarding to new logic wrapper if we wanted to support direct call,
    // but here we just keep the old implementation or better yet, deprecate it.
    // For now, I'll keep the original implementation below to ensure I don't break anything
    // that might still rely on it, although the client will switch to the new actions.

  const startTime = Date.now();
  console.log(`[action] generatePlan (Legacy) started at ${new Date().toISOString()}`);

  const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  if (!apiKey) {
    return { success: false, message: "API Key missing" };
  }

  try {
    const scraper = new PineconeRetriever();
    const ai = new GeminiService(apiKey);

    const query = input.isDestinationDecided
      ? `${input.destination}で${input.companions}と${input.theme.join("や")}を楽しむ旅行`
      : `${input.region}で${input.travelVibe || ""}楽しむ旅行`;

    let contextArticles: any[] = [];
    try {
        contextArticles = await scraper.search(query, { topK: 1 });
    } catch (e) {
        contextArticles = [];
    }

    const totalDays = extractDuration(input.dates);
    const shouldSplit = totalDays > 1;

    let plan: Itinerary;

    if (shouldSplit) {
      console.log(`[action] Duration is ${totalDays} days. Splitting into 2-day chunks...`);
      const chunks = splitDaysIntoChunks(totalDays);
      console.log(`[action] Created ${chunks.length} chunks:`, chunks);

      // Generate plan for each chunk with aggressive parallel processing
      const chunkPlans: Itinerary[] = [];
      const BATCH_SIZE = 5;

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
        let prompt = `
        Destination: ${input.destination || "Decide based on request"}
        Region: ${input.region}
        Dates: ${input.dates}
        Companions: ${input.companions}
        Themes: ${input.theme.join(", ")}
        Budget: ${input.budget}
        Pace: ${input.pace}
        Must-Visit: ${input.mustVisitPlaces?.join(", ")}
        FreeText: ${input.freeText}
        `;

        plan = await ai.generateItinerary(prompt, contextArticles);
    }

    // Fetch hero image
    const heroImageData = await getUnsplashImage(plan.destination);
    if (heroImageData) {
      plan.heroImage = heroImageData.url;
      plan.heroImagePhotographer = heroImageData.photographer;
      plan.heroImagePhotographerUrl = heroImageData.photographerUrl;
    }

    return { success: true, data: plan };
  } catch (error: any) {
    console.error("[action] Plan generation failed:", error);
    return { success: false, message: "Error" };
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
  const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
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
