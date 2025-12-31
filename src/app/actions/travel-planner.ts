"use server";

import { GeminiService } from "@/lib/ai/gemini";
// import { WebScraperRetriever } from '@/lib/rag/scraper';
import { PineconeRetriever } from "@/lib/rag/pinecone-retriever";
import { Itinerary, UserInput } from "@/lib/types";

export type ActionState = {
  success: boolean;
  message?: string;
  data?: Itinerary;
};

export async function generatePlan(input: UserInput): Promise<ActionState> {
  const startTime = Date.now();
  console.log(`[action] generatePlan started at ${new Date().toISOString()}`);
  console.log(`[action] Input: ${JSON.stringify(input)}`);

  const apiKey = process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    console.error("[action] API Key is missing in environment variables");
    return {
      success: false,
      message: "Server configuration error: API Key missing",
    };
  }

  try {
    const scraper = new PineconeRetriever();
    const ai = new GeminiService(apiKey);

    // 1. RAG: Search for relevant content
    // If destination is undecided, search for region + themes
    const destinationQuery = input.isDestinationDecided
      ? input.destination
      : input.region === "domestic"
      ? "日本国内 おすすめ旅行先"
      : input.region === "overseas"
      ? "海外旅行 おすすめ"
      : "おすすめ旅行先";

    const query = `${destinationQuery} ${input.theme.join(" ")} ${
      input.companions
    }`;
    console.log(`[action] Step 1: Searching for "${query}"`);

    const contextArticles = await scraper.search(query);
    console.log(
      `[action] Step 1 Complete. Found ${
        contextArticles.length
      } articles. Elapsed: ${Date.now() - startTime}ms`
    );

    // 2. AI: Generate Plan
    console.log(`[action] Step 2: Generating Plan with AI...`);

    let prompt = "";
    if (input.isDestinationDecided) {
      prompt = `
        Destination: ${input.destination}
        Dates: ${input.dates}
        Companions: ${input.companions}
        Themes: ${input.theme.join(", ")}
        Budget: ${input.budget || "Not specified"}
        Pace: ${input.pace || "Not specified"}
        Specific Requests: ${input.freeText || "None"}

        Please create a travel itinerary for this request.
      `;
    } else {
       prompt = `
        User has NOT decided on a specific destination yet.
        Preferred Region: ${input.region === "domestic" ? "Japan (Domestic)" : input.region === "overseas" ? "Overseas (International)" : "Anywhere"}
        Dates: ${input.dates}
        Companions: ${input.companions}
        Themes: ${input.theme.join(", ")}
        Budget: ${input.budget || "Not specified"}
        Pace: ${input.pace || "Not specified"}
        Specific Requests: ${input.freeText || "None"}

        Task:
        1. Select the BEST single destination that matches the user's themes, budget, and region preference.
        2. Create a detailed travel itinerary for that chosen destination.
        3. The "destination" field in the JSON must be the name of the place you chose.
      `;
    }

    const plan = await ai.generateItinerary(prompt, contextArticles);
    console.log(
      `[action] Step 2 Complete. Plan ID: ${plan.id}. Total Elapsed: ${
        Date.now() - startTime
      }ms`
    );

    return { success: true, data: plan };
  } catch (error) {
    console.error("[action] Plan generation failed:", error);
    const elapsed = Date.now() - startTime;
    return {
      success: false,
      message: `Plan generation failed after ${elapsed}ms. Error: ${
        error instanceof Error ? error.message : String(error)
      }`,
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
    return { response: "Sorry, I couldn't process your request." };
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
    return { success: true, data: newPlan };
  } catch (e) {
    console.error("Regeneration failed", e);
    return { success: false, message: "Failed to regenerate plan." };
  }
}
