import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { generateText } from "ai";
import { AIService, Article } from "@/lib/ai/types";
import { Itinerary, PlanOutline, DayPlan, PlanOutlineDay } from '@/types';

export class GeminiService implements AIService {
  private google: ReturnType<typeof createGoogleGenerativeAI>;
  private modelName: string;

  constructor(apiKey: string) {
    this.google = createGoogleGenerativeAI({ apiKey });
    this.modelName = process.env.GOOGLE_MODEL_NAME || "gemini-2.5-flash";
    console.log(`[gemini] Service initialized. Using model: ${this.modelName}`);
  }

  // Legacy method - can be kept for fallback or specific uses
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

  /**
   * Step 1: Generate Master Outline (No detailed activities yet)
   * Focus on selecting destination (if needed) and high-level routing.
   */
  async generateOutline(
    prompt: string,
    context: Article[]
  ): Promise<PlanOutline> {
    console.log(`[gemini] Generating Plan Outline...`);

    const MAX_CONTENT_LENGTH = 150;
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
      Create a Travel Plan Outline in JAPANESE.
      ${contextText ? `Context: ${contextText}` : ""}

      Rules:
      1. If destination is NOT specified, choose the BEST destination based on User Request.
      2. CRITICAL: Respect the requested "Region".
         - If Region is "Japan (Domestic)", choose a destination IN JAPAN.
         - If Region is "Overseas (International)", choose a destination OUTSIDE JAPAN. Do NOT choose Tokyo, Osaka, etc.
         - If Region is "Anywhere", choose based on Vibe.
      3. Plan the route for ALL days.
      4. For each day, list the "highlight_areas" (e.g. ["Asakusa", "Sky Tree"]).
      5. Ensure NO DUPLICATE areas across days unless necessary (e.g. return to hub).
      6. Return JSON only.

      JSON:
      {
        "destination": "string (The chosen destination name)",
        "description": "string (Overview of the entire trip in Japanese)",
        "days": [
          {
            "day": number,
            "title": "string (Theme/Area of the day)",
            "highlight_areas": ["string", "string"]
          }
        ]
      }
    `;

    const fullPrompt = `${systemInstruction}

USER REQUEST:
${prompt}`;

    try {
      const { text } = await generateText({
        model: this.google(this.modelName, { structuredOutputs: true }),
        prompt: fullPrompt,
        temperature: 0.2, // Slightly higher for creative destination choice
      });

      const cleanedText = text.replace(/```json/g, "").replace(/```/g, "").trim();
      return JSON.parse(cleanedText) as PlanOutline;
    } catch (e) {
      console.error("[gemini] Outline generation failed:", e);
      throw e;
    }
  }

  /**
   * Step 2: Generate Detailed Activities for specific days based on Outline
   */
  async generateDayDetails(
    prompt: string,
    context: Article[],
    startDay: number,
    endDay: number,
    outlineDays: PlanOutlineDay[]
  ): Promise<DayPlan[]> {
    console.log(`[gemini] Generating details for days ${startDay}-${endDay}...`);

    // Provide ONLY relevant outline info to keep context small
    const outlineInfo = JSON.stringify(outlineDays);

    // Use limited context for speed
    const MAX_CONTENT_LENGTH = 150;
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
      Create detailed itinerary for Days ${startDay} to ${endDay} in JAPANESE.

      MASTER PLAN OUTLINE (You MUST follow this):
      ${outlineInfo}

      ${contextText ? `Context: ${contextText}` : ""}

      Rules:
      1. Strictly follow the "highlight_areas" defined in the Master Plan Outline for each day.
      2. Create detailed activities (3 meals + spots) fitting the user's pace.
      3. Return JSON array of DayPlans.

      JSON:
      {
        "days": [
          {
            "day": number,
            "title": "string (Same as outline)",
            "activities": [
               {
                "time": "string",
                "activity": "string",
                "description": "string"
               }
            ]
          }
        ],
        "reference_indices": []
      }
    `;

    const fullPrompt = `${systemInstruction}

USER REQUEST:
${prompt}`;

    try {
      const { text } = await generateText({
        model: this.google(this.modelName, { structuredOutputs: true }),
        prompt: fullPrompt,
        temperature: 0.1,
      });

      const cleanedText = text.replace(/```json/g, "").replace(/```/g, "").trim();
      const data = JSON.parse(cleanedText);

      // Ensure we just return the days array
      return data.days as DayPlan[];
    } catch (e) {
      console.error(`[gemini] Detail generation failed for days ${startDay}-${endDay}:`, e);
      throw e;
    }
  }
}
