import { GoogleGenerativeAI, GenerativeModel } from "@google/generative-ai";
import { AIService, Article } from "@/lib/ai/types";
import { Itinerary } from "@/lib/types";

export class GeminiService implements AIService {
  private genAI: GoogleGenerativeAI;
  private model: GenerativeModel;

  constructor(apiKey: string) {
    this.genAI = new GoogleGenerativeAI(apiKey);
    const modelName =
      (typeof process !== "undefined" && process.env.GOOGLE_MODEL_NAME) ||
      "gemini-2.5-flash";
    console.log(`[gemini] Service initialized. Using model: ${modelName}`);
    this.model = this.genAI.getGenerativeModel({ model: modelName });
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
    const MAX_CONTENT_LENGTH = 100; // Aggressive reduction to 100 chars for maximum speed
    const contextText = context
      .map((a, i) => {
        const truncatedContent = a.content.length > MAX_CONTENT_LENGTH
          ? a.content.substring(0, MAX_CONTENT_LENGTH) + "..."
          : a.content;
        return `[${i}] ${a.title}: ${truncatedContent}`;
      })
      .join("\n");

    // System instruction containing context, instructions, examples, and schema
    const dayRangeInfo = startDay && endDay
      ? `\n      DAY RANGE: Generate itinerary ONLY for days ${startDay} to ${endDay}. The "day" field in the JSON must start from ${startDay} and end at ${endDay}.`
      : "";

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

    // Combine system instruction and user request into single message for speed
    const fullPrompt = `${systemInstruction}

USER REQUEST:
${prompt}`;

    try {
      console.log(
        `[gemini] Request prepared. Sending to Google Generative AI...`
      );
      const startTime = Date.now();
      const result = await this.model.generateContent({
        contents: [
          {
            role: "user",
            parts: [{ text: fullPrompt }]
          }
        ],
        generationConfig: {
          responseMimeType: "application/json",
          temperature: 0.1, // Minimum temperature for maximum speed
        },
      });
      const response = await result.response;

      const endTime = Date.now();
      console.log(`[gemini] Response received in ${endTime - startTime}ms.`);

      let text = response.text();
      console.log(`[gemini] Response text length: ${text.length} characters.`);

      // Sanitizing JSON if markdown fences are present (just in case, though MIME type should handle it)
      text = text
        .replace(/```json/g, "")
        .replace(/```/g, "")
        .trim();

      try {
        const data = JSON.parse(text);

        // Quick reference processing
        const indices = data.reference_indices || [];
        data.references = indices
          .map((idx: number) => context[idx])
          .filter(Boolean)
          .map((a: any) => ({
            title: a.title,
            url: a.url,
            image: a.imageUrl || "",
            snippet: a.snippet,
          }));

        return data as Itinerary;
      } catch (jsonError) {
        console.error(`[gemini] JSON Parse Error:`, jsonError);
        console.error(`[gemini] Raw Response text:`, text);
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

    // Extract user instructions from chat history
    const userInstructions = chatHistory
      .filter((m) => m.role === "user")
      .map((m) => m.text)
      .join("\n");

    const systemPrompt = `
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
      const result = await this.model.generateContent({
        contents: [{ role: "user", parts: [{ text: systemPrompt }] }],
        generationConfig: {
          responseMimeType: "application/json",
          temperature: 0.1,
        },
      });
      const response = await result.response;
      let text = response.text();
      text = text
        .replace(/```json/g, "")
        .replace(/```/g, "")
        .trim();

      const data = JSON.parse(text);

      // Preserve original references if not present in new data (though AI should return them if prompt works well, let's be safe)
      if (!data.references && currentPlan.references) {
        data.references = currentPlan.references;
      }

      return data as Itinerary;
    } catch (e) {
      console.error("Failed to modify itinerary", e);
      throw e;
    }
  }

  async chat(message: string, context: Itinerary): Promise<string> {
    const chat = this.model.startChat({
      history: [
        {
          role: "user",
          parts: [
            {
              text: `
You are a friendly travel assistant discussing a travel plan with the user.
Current Plan Context: ${JSON.stringify(context)}

Your goal is to have a light, conversational chat to understand what the user wants to change.
Do NOT generate a new JSON plan yet. Just acknowledge the request, suggest ideas, and ask clarifying questions if needed.
INSTRUCTIONS:
1. Keep responses SHORT and CONCISE (aim for 1-2 sentences).
2. Do NOT end every message with a question. Only ask if clarification is truly needed.
3. Be helpful but efficient.
4. Reply in Japanese.
`,
            },
          ],
        },
        {
          role: "model",
          parts: [
            {
              text: "承知しました。プランについてのご感想や変更したい点があれば、お気軽におっしゃってくださいね。",
            },
          ],
        },
      ],
    });

    const result = await chat.sendMessage(message);
    return result.response.text();
  }
}
