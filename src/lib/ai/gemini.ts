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
    context: Article[]
  ): Promise<Itinerary> {
    console.log(
      `[gemini] Generating itinerary. Context articles: ${context.length}`
    );
    const contextText = context
      .map((a, i) => `[ID: ${i}]\nTitle: ${a.title}\nContent: ${a.content}`)
      .join("\n\n");

    const systemPrompt = `
      Your role is to create special travel Selection itineraries based on the blog's archives.
      
      CONTEXT (Travel Diary Archives):
      ${contextText}
      
      CURRENT DATE: ${new Date().toISOString().split('T')[0]}

      USER REQUEST:
      ${prompt}
      
      INSTRUCTIONS:
      1. Create a detailed itinerary based on the User Request (Destination, Dates, Companions, Themes, Budget, Pace).
      2. ANALYZE if the Context articles match the Destination in the User Request.
         - IF MATCH (Same City/Region): PRIORITIZE using spots, restaurants, and experiences from the Context.
         - IF MISMATCH (Different City/Region): You may use the "vibe" or "style" from the Context as inspiration, BUT be careful.
      3. CRITICAL: If the User asks for "Paris" and context is about "Tokyo", do NOT put Tokyo cafes in Paris. Use general knowledge for Paris instead.
      4. STRICT RULE: If using a Context article for style/vibe inspiration only (because of location mismatch), DO NOT mention the article name or location in the final text description. Just apply the style silently.
      5. REFERENCE FILTERING: Populate \`reference_indices\` with the **IDs** of Context articles that were ACTUAL SOURCES of information or specific inspiration.
         - DO NOT include an ID just because it exists in context.
         - DO NOT include an ID if the article was not used or is irrelevant.
         - If no context was used, return an empty array.
      6. IMAGES: Use a URL from context ONLY if explicitly available and relevant. Otherwise return null.
      7. LANGUAGE: The JSON structure keys must be in English, but ALL content values (description, reasoning, titles, activities) MUST be in **JAPANESE**.
      8. RETURN ONLY JSON. No markdown formatting.

      EXAMPLES:
      User Request: "京都で静かなお寺に行きたい"
      Output (JSON):
      {
        "reasoning": "ユーザーは混雑を嫌っているため、清水寺や金閣寺などの定番は除外。アクセスは少し悪いが雰囲気が良い詩仙堂や圓光寺を選択。記事コンテキストに京都の穴場カフェがあるのでそれを休憩場所に採用。",
        "destination": "Kyoto",
        "description": "観光客の喧騒から離れ、心静かに庭園と向き合う大人の京都旅をご提案します。",
        "days": [ ... (detailed plan) ... ],
        "reference_indices": [0, 2]
      }
      
      JSON SCHEMA:
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

    try {
      console.log(
        `[gemini] Request prepared. Sending to Google Generative AI...`
      );
      const startTime = Date.now();
      const result = await this.model.generateContent({
        contents: [{ role: "user", parts: [{ text: systemPrompt }] }],
        generationConfig: {
          responseMimeType: "application/json",
          temperature: 0.35,
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

        // Deduplicate indices just in case the AI hallucinates duplicates
        const uniqueIndices = Array.from(
          new Set(data.reference_indices || [])
        ) as number[];

        // Hydrate references from indices
        const hydratedReferences = uniqueIndices
          .map((idx: number) => {
            const article = context[idx];
            if (!article) return null;
            return {
              title: article.title,
              url: article.url,
              image: article.imageUrl || "", // Map imageUrl to image for frontend
              snippet: article.snippet,
            };
          })
          .filter(Boolean);

        // Fallback or explicit references assignment
        if (hydratedReferences.length > 0) {
          data.references = hydratedReferences;
        } else {
          console.log(`[gemini] No specific references cited by AI.`);
          data.references = [];
        }

        console.log(
          `[gemini] Parsed JSON successfully. Destination: ${data.destination}`
        );
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
      const result = await this.model.generateContent(systemPrompt);
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
