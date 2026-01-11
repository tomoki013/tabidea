import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { generateText } from "ai";
import { AIService, Article } from "@/lib/ai/types";
import { Itinerary } from "@/lib/types";

export class GeminiService implements AIService {
  private google: ReturnType<typeof createGoogleGenerativeAI>;
  private modelName: string;

  constructor(apiKey: string) {
    this.google = createGoogleGenerativeAI({ apiKey });
    this.modelName = process.env.GOOGLE_MODEL_NAME || "gemini-2.5-flash";
    console.log(`[gemini] Service initialized. Using model: ${this.modelName}`);
  }

  async generateItinerary(
    prompt: string,
    context: Article[],
    startDay?: number,
    endDay?: number
  ): Promise<Itinerary> {
    console.log(
      `[gemini] Generating itinerary. Context articles: ${context.length}`
    );
    const MAX_CONTENT_LENGTH = 100;
    const contextText = context
      .map((a, i) => {
        const truncatedContent =
          a.content.length > MAX_CONTENT_LENGTH
            ? a.content.substring(0, MAX_CONTENT_LENGTH) + "..."
            : a.content;
        return `[${i}] ${a.title}: ${truncatedContent}`;
      })
      .join("\n");

    const systemInstruction = `
      Create travel itinerary in JAPANESE.${startDay && endDay ? ` Days ${startDay}-${endDay} only.` : ""}
      ${contextText ? `Context: ${contextText}` : ""}

      Rules:
      1. Follow User Request (Destination, Dates, Companions, Themes, Budget, Pace).
      2. 3 meals/day + activities by pace: relaxed(1-2), balanced(3-4), active(5-6), packed(7-8).
      3. Return JSON only.

      JSON:
      {
        "reasoning": "string (Why you chose this plan/spots, logic behind decisions)",
        "id": "string (unique-ish id)",
        "destination": "string",
        "heroImage": "string | null (URL from one of the context articles if available, otherwise null)",
        "description": "string (A compelling intro in Japanese, mentioning if you used specific blog tips)",
        "days": [
          {
            "day": number,
            "title": "string (Theme of the day)",
            "activities": [
              {
                "time": "string (e.g. 10:00)",
                "activity": "string",
                "description": "string (detailed description)"
              }
            ]
          }
        ],
        "reference_indices": [
           // Array of numbers (0-based) corresponding to the [ID: n] of Context articles used.
           // ONLY include IDs of articles that are RELEVANT to the destination.
           // Example: [0, 2] means Article [ID: 0] and [ID: 2] were used.
        ]
      }
    `;

    const fullPrompt = `${systemInstruction}

USER REQUEST:
${prompt}`;

    try {
      console.log(`[gemini] Request prepared. Sending to Vercel AI SDK...`);
      const startTime = Date.now();

      const { text } = await generateText({
        model: this.google(this.modelName, { structuredOutputs: true }),
        prompt: fullPrompt,
        temperature: 0.1,
      });

      const endTime = Date.now();
      console.log(`[gemini] Response received in ${endTime - startTime}ms.`);
      console.log(`[gemini] Response text length: ${text.length} characters.`);

      // Sanitize JSON if markdown fences are present
      const cleanedText = text
        .replace(/```json/g, "")
        .replace(/```/g, "")
        .trim();

      try {
        const data = JSON.parse(cleanedText);

        // Quick reference processing
        const indices = data.reference_indices || [];
        data.references = indices
          .map((idx: number) => context[idx])
          .filter(Boolean)
          .map((a: Article) => ({
            title: a.title,
            url: a.url,
            image: a.imageUrl || "",
            snippet: a.snippet,
          }));

        return data as Itinerary;
      } catch (jsonError) {
        console.error(`[gemini] JSON Parse Error:`, jsonError);
        console.error(`[gemini] Raw Response text:`, cleanedText);
        throw new Error("Failed to parse AI response as JSON");
      }
    } catch (error) {
      console.error(
        "[gemini] Generation failed details:",
        JSON.stringify(error, null, 2)
      );
      throw error;
    }
  }

  async modifyItinerary(
    currentPlan: Itinerary,
    chatHistory: { role: string; text: string }[]
  ): Promise<Itinerary> {
    console.log(`[gemini] Modifying itinerary based on chat history...`);

    const userInstructions = chatHistory
      .filter((m) => m.role === "user")
      .map((m) => m.text)
      .join("\n");

    const prompt = `
        You are "Tomokichi's Travel Diary AI". You are refining an existing travel itinerary based on the user's feedback.

        CURRENT ITINERARY JSON:
        ${JSON.stringify(currentPlan)}

        USER FEEDBACK / CHAT HISTORY:
        ${userInstructions}

        INSTRUCTIONS:
        1. MODIFY the Current Itinerary based on the User Feedback.
        2. KEEP all parts of the itinerary that the user did NOT ask to change EXACTLY THE SAME. Do not invent new changes.
        3. If the user asks to change a restaurant, time, or activity, update only that specific part.
        4. RETURN the FULL updated JSON object strictly following the original schema.
        5. NO markdown formatting. Output raw JSON.
     `;

    try {
      const { text } = await generateText({
        model: this.google(this.modelName, { structuredOutputs: true }),
        prompt,
        temperature: 0.1,
      });

      const cleanedText = text
        .replace(/```json/g, "")
        .replace(/```/g, "")
        .trim();

      const data = JSON.parse(cleanedText);

      // Preserve original references if not present in new data
      if (!data.references && currentPlan.references) {
        data.references = currentPlan.references;
      }

      return data as Itinerary;
    } catch (e) {
      console.error("Failed to modify itinerary", e);
      throw e;
    }
  }
}
