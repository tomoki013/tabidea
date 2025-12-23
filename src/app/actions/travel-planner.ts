'use server';

import { GeminiService } from '@/lib/ai/gemini';
// import { WebScraperRetriever } from '@/lib/rag/scraper';
import { PineconeRetriever } from '@/lib/rag/pinecone-retriever';
import { Itinerary, UserInput } from '@/lib/types';

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
    console.error('[action] API Key is missing in environment variables');
    return { success: false, message: 'Server configuration error: API Key missing' };
  }

  try {
    const scraper = new PineconeRetriever();
    const ai = new GeminiService(apiKey);

    // 1. RAG: Search for relevant content
    const query = `${input.destination} ${input.theme.join(" ")} ${input.companions}`;
    console.log(`[action] Step 1: Searching for "${query}"`);
    
    const contextArticles = await scraper.search(query);
    console.log(`[action] Step 1 Complete. Found ${contextArticles.length} articles. Elapsed: ${Date.now() - startTime}ms`);

    // 2. AI: Generate Plan
    console.log(`[action] Step 2: Generating Plan with AI...`);
    const prompt = `
      Destination: ${input.destination}
      Dates: ${input.dates}
      Companions: ${input.companions}
      Themes: ${input.theme.join(", ")}
      
      Please create a travel itinerary for this request.
    `;

    const plan = await ai.generateItinerary(prompt, contextArticles);
    console.log(`[action] Step 2 Complete. Plan ID: ${plan.id}. Total Elapsed: ${Date.now() - startTime}ms`);

    return { success: true, data: plan };

  } catch (error) {
    console.error('[action] Plan generation failed:', error);
    const elapsed = Date.now() - startTime;
    return { 
        success: false, 
        message: `Plan generation failed after ${elapsed}ms. Error: ${error instanceof Error ? error.message : String(error)}` 
    };
  }
}

export async function chatWithPlanner(history: Itinerary, userMessage: string): Promise<{ response: string }> {
    const apiKey = process.env.GOOGLE_API_KEY;
    if (!apiKey) {
        return { response: "System Error: API Key missing" };
    }
    
    try {
        const ai = new GeminiService(apiKey);
        const reply = await ai.chat(userMessage, history);
        return { response: reply };
    } catch(e) {
        console.error(e);
        return { response: "Sorry, I couldn't process your request." };
    }
}

export async function regeneratePlan(currentPlan: Itinerary, chatHistory: {role: string, text: string}[]): Promise<ActionState> {
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
