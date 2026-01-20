import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { streamText, type Message } from "ai";
import { Itinerary } from '@/types';

// Allow streaming responses up to 30 seconds
export const maxDuration = 30;

export async function POST(req: Request) {
  try {
    const { messages, itinerary }: { messages: Message[]; itinerary: Itinerary } = await req.json();

    const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "API key not configured" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Create Google provider with the correct API key
    const google = createGoogleGenerativeAI({
      apiKey,
    });

    // Build system message with the travel plan context
    const systemMessage = `You are a friendly travel assistant discussing a travel plan with the user.
Current Plan Context: ${JSON.stringify(itinerary)}

Your goal is to have a light, conversational chat to understand what the user wants to change.
Do NOT generate a new JSON plan yet. Just acknowledge the request, suggest ideas, and ask clarifying questions if needed.

INSTRUCTIONS:
1. Keep responses SHORT and CONCISE (aim for 1-2 sentences).
2. Do NOT end every message with a question. Only ask if clarification is truly needed.
3. Be helpful but efficient.
4. Reply in Japanese.
5. Remember the conversation history and refer back to it when relevant.`;

    const result = await streamText({
      model: google(process.env.GOOGLE_MODEL_NAME || "gemini-2.5-flash"),
      system: systemMessage,
      messages,
    });

    return result.toDataStreamResponse();
  } catch (error) {
    console.error("Chat API error:", error);
    return new Response(JSON.stringify({ error: "Failed to process chat request" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
