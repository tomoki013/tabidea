import { streamText, type Message } from "ai";
import { createTranslator } from "next-intl";
import { resolveModel } from '@/lib/services/ai/model-provider';
import { Itinerary } from '@/types';
import type { LanguageCode } from "@/lib/i18n/locales";
import { resolveLanguageFromAcceptLanguage } from "@/lib/i18n/locales";
import enMessages from "@/messages/en/api/chat.json";
import jaMessages from "@/messages/ja/api/chat.json";

// Allow streaming responses up to 30 seconds
export const maxDuration = 30;

const CHAT_MESSAGES = {
  en: enMessages,
  ja: jaMessages,
} as const;

type ChatLocale = keyof typeof CHAT_MESSAGES;

function resolveChatLocale(req: Request, prefersJapanese: boolean): ChatLocale {
  if (prefersJapanese) {
    return "ja";
  }

  const acceptedLanguage = resolveLanguageFromAcceptLanguage(
    req.headers.get("accept-language")
  );

  return acceptedLanguage === "ja" ? "ja" : "en";
}

function createChatTranslator(locale: ChatLocale) {
  return createTranslator({
    locale: locale as LanguageCode,
    messages: CHAT_MESSAGES[locale],
    namespace: "api.chat",
  });
}

export async function POST(req: Request) {
  try {
    const { messages, itinerary }: { messages: Message[]; itinerary: Itinerary } = await req.json();

    const { model, modelName } = resolveModel('chat');
    console.log(`[chat] Using model: ${modelName}`);

    const destination = itinerary.destination || "Unknown destination";
    const dayCount = itinerary.days?.length || 0;
    const latestUserMessage = [...messages]
      .reverse()
      .find((message) => message.role === "user");
    const latestUserText =
      typeof latestUserMessage?.content === "string"
        ? latestUserMessage.content
        : "";
    const prefersJapanese = /[ぁ-んァ-ン一-龯]/.test(latestUserText);
    const locale = resolveChatLocale(req, prefersJapanese);
    const t = createChatTranslator(locale);
    const languageInstruction = t("languageInstruction");
    const agreementExamples = t("agreementExamples");
    const destinationChangeResponse = t("destinationChangeResponse", {
      destination,
    });

    // Build system message with the travel plan context
    const systemMessage = `You are a friendly travel assistant discussing a travel plan with the user.
Current Plan Context: ${JSON.stringify(itinerary)}

Your goal is to have a light, conversational chat to understand what the user wants to change about the CURRENT plan.
Do NOT generate a new JSON plan yet. Just acknowledge the request, suggest ideas, and ask clarifying questions if needed.

INSTRUCTIONS:
1. Keep responses SHORT and CONCISE (aim for 1-2 sentences).
2. Do NOT end every message with a question. Only ask if clarification is truly needed.
3. Be helpful but efficient.
4. ${languageInstruction}
5. Remember the conversation history and refer back to it when relevant.
6. If the user clearly agrees to apply your proposed adjustments (e.g., ${agreementExamples}), append exactly this tag at the END of your response: [[REGEN_READY]]
7. Do NOT output [[REGEN_READY]] unless the user agreement is clear.
8. Never include more than one [[REGEN_READY]] tag in a single response.

CRITICAL CONSTRAINTS - YOU MUST FOLLOW THESE:
- The destination "${destination}" CANNOT be changed. If the user asks to change the destination entirely, politely decline and explain that a new plan should be created for a different destination.
- The overall trip duration (${dayCount} days) should remain the same.
- Only suggest modifications within the scope of the current destination: changing specific spots, restaurants, activities, time adjustments, adding/removing activities within the same area.
- If the user requests a completely different trip (different country, different city, different duration), respond: "${destinationChangeResponse}"
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
