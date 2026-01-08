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
    // If destination is undecided, search for region + themes
    const destinationQuery = input.isDestinationDecided
      ? input.destination
      : input.region === "domestic"
      ? "日本国内 おすすめ旅行先"
      : input.region === "overseas"
      ? "海外旅行 おすすめ"
      : "おすすめ旅行先";

    // Incorporate travelVibe into the search query if present
    const vibeQuery = input.travelVibe ? ` ${input.travelVibe}` : "";

    const query = `${destinationQuery}${vibeQuery} ${input.theme.join(" ")} ${
      input.companions
    }`;
    console.log(`[action] Step 1: Searching for "${query}"`);

    let contextArticles: any[] = [];
    try {
        contextArticles = await scraper.search(query);
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

    const plan = await ai.generateItinerary(prompt, contextArticles);

    // Fetch hero image from Unsplash
    const heroImage = await getUnsplashImage(plan.destination);
    if (heroImage) {
      plan.heroImage = heroImage;
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
      const heroImage = await getUnsplashImage(newPlan.destination);
      if (heroImage) {
        newPlan.heroImage = heroImage;
      }
    } else {
        // Keep the old image if destination is the same
        newPlan.heroImage = currentPlan.heroImage;
    }

    return { success: true, data: newPlan };
  } catch (e) {
    console.error("Regeneration failed", e);
    return { success: false, message: "プランの再生成に失敗しました。" };
  }
}
