import { streamText, type Message } from "ai";
import { resolveModel } from '@/lib/services/ai/model-provider';
import { Itinerary } from '@/types';

// Allow streaming responses up to 30 seconds
export const maxDuration = 30;

export async function POST(req: Request) {
  try {
    const { messages, itinerary }: { messages: Message[]; itinerary: Itinerary } = await req.json();

    const { model, modelName } = resolveModel('chat');
    console.log(`[chat] Using model: ${modelName}`);

    const destination = itinerary.destination || '不明';
    const dayCount = itinerary.days?.length || 0;

    // Build system message with the travel plan context
    const systemMessage = `You are a friendly travel assistant discussing a travel plan with the user.
Current Plan Context: ${JSON.stringify(itinerary)}

Your goal is to have a light, conversational chat to understand what the user wants to change about the CURRENT plan.
Do NOT generate a new JSON plan yet. Just acknowledge the request, suggest ideas, and ask clarifying questions if needed.

INSTRUCTIONS:
1. Keep responses SHORT and CONCISE (aim for 1-2 sentences).
2. Do NOT end every message with a question. Only ask if clarification is truly needed.
3. Be helpful but efficient.
4. Reply in Japanese.
5. Remember the conversation history and refer back to it when relevant.

CRITICAL CONSTRAINTS - YOU MUST FOLLOW THESE:
- The destination "${destination}" CANNOT be changed. If the user asks to change the destination entirely, politely decline and explain that a new plan should be created for a different destination.
- The overall trip duration (${dayCount}日間) should remain the same.
- Only suggest modifications within the scope of the current destination: changing specific spots, restaurants, activities, time adjustments, adding/removing activities within the same area.
- If the user requests a completely different trip (different country, different city, different duration), respond: "行き先を大きく変更する場合は、新しいプランを作成してください。こちらでは${destination}のプランの微調整をお手伝いします！"
- Never suggest or agree to changes that would fundamentally alter the trip's destination or region.`;

    const result = await streamText({
      model,
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
