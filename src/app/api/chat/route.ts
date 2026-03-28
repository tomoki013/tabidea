import { streamText, type Message } from "ai";
import { createTranslator } from "next-intl";
import { resolveModel } from '@/lib/services/ai/model-provider';
import { Itinerary } from '@/types';
import { buildChatContextJson } from '@/lib/services/ai/gemini';
import type { LanguageCode } from "@/lib/i18n/locales";
import { resolveLanguageFromAcceptLanguage } from "@/lib/i18n/locales";
import enMessages from "@/messages/en/api/chat.json";
import jaMessages from "@/messages/ja/api/chat.json";

// Allow streaming responses up to 60 seconds (large context can slow TTFB)
export const maxDuration = 60;

const CHAT_MESSAGES = {
  en: enMessages,
  ja: jaMessages,
} as const;

type ChatLocale = keyof typeof CHAT_MESSAGES;
type ChatTranslator = (
  key: string,
  values?: Record<string, unknown>
) => string;

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
  const rawT = createTranslator({
    locale: locale as LanguageCode,
    messages: CHAT_MESSAGES[locale],
    namespace: "api.chat",
  });

  const t: ChatTranslator = (key, values) => {
    if (values) {
      return rawT(key as never, values as never);
    }
    return rawT(key as never);
  };

  return t;
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

    // Build system message with lean plan context to reduce token usage
    const systemMessage = `You are a proactive travel assistant helping to refine a travel plan.
Current Plan: ${JSON.stringify(buildChatContextJson(itinerary))}

YOUR APPROACH:
- When the user requests a change, IMMEDIATELY propose a specific modification. Do NOT ask clarifying questions unless the request is truly ambiguous.
- If the user's request is specific enough to act on (e.g., "add more local food", "make day 2 more relaxed"), propose a concrete change right away.
- If the user seems to agree with or positively react to your proposal, append [[REGEN_READY]] immediately.

INSTRUCTIONS:
1. Keep responses SHORT (1-3 sentences). Propose a specific change, then stop.
2. ${languageInstruction}
3. When proposing a change, be concrete: mention which day, which activity, and what you'd replace it with.
4. If the user clearly agrees or reacts positively (e.g., ${agreementExamples}, or brief affirmations like "OK", "👍", "nice"), append exactly [[REGEN_READY]] at the END of your response.
5. If the user's initial request is very clear and specific (e.g., "2日目のランチを地元の料理に変えて"), you MAY propose the change AND include [[REGEN_READY]] in your first response, since the intent is unambiguous.
6. Never include more than one [[REGEN_READY]] tag in a single response.
7. Remember the conversation history and refer back to it.

CONSTRAINTS:
- The destination "${destination}" CANNOT be changed. If the user asks to change the destination, politely decline and suggest creating a new plan.
- The trip duration (${dayCount} days) should remain the same.
- Only suggest modifications within the current destination's scope: changing spots, restaurants, activities, timing, or pace.
- If the user requests a completely different trip, respond: "${destinationChangeResponse}"
- Never suggest changes that would fundamentally alter the destination or region.`;

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
