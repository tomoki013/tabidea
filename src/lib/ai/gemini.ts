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
    const MAX_CONTENT_LENGTH = 500;
    const contextText = context
      .map((a, i) => {
        const truncatedContent = a.content.length > MAX_CONTENT_LENGTH
          ? a.content.substring(0, MAX_CONTENT_LENGTH) + "..."
          : a.content;
        return `[ID: ${i}]\nTitle: ${a.title}\nURL: ${a.url}\nContent: ${truncatedContent}`;
      })
      .join("\n\n");

    // System instruction containing context, instructions, examples, and schema
    const systemInstruction = `
      Your role is to create special travel Selection itineraries based on the blog's archives.

      CONTEXT (Travel Diary Archives):
      ${contextText}

      CURRENT DATE: ${new Date().toISOString().split('T')[0]}

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

      EXAMPLE 1 (目的地が決まっている場合):
      User Request: "京都で静かなお寺に行きたい、1泊2日、夫婦旅行"
      Output (JSON):
      {
        "reasoning": "ユーザーは混雑を嫌っているため、清水寺や金閣寺などの定番は除外。アクセスは少し悪いが雰囲気が良い詩仙堂や圓光寺を選択。記事コンテキストに京都の穴場カフェがあるのでそれを休憩場所に採用。",
        "id": "kyoto-quiet-temples-2024",
        "destination": "京都",
        "heroImage": null,
        "description": "観光客の喧騒から離れ、心静かに庭園と向き合う大人の京都旅をご提案します。",
        "days": [
          {
            "day": 1,
            "title": "洛北の静寂を訪ねて",
            "activities": [
              {"time": "10:00", "activity": "詩仙堂", "description": "石川丈山が建てた山荘で、手入れの行き届いた庭園と静寂を楽しめます。"},
              {"time": "12:00", "activity": "一乗寺エリアでランチ", "description": "地元の人に愛される隠れ家カフェでゆっくりと。"},
              {"time": "14:00", "activity": "圓光寺", "description": "紅葉の名所として知られますが、新緑の季節も美しい庭園です。"},
              {"time": "16:00", "activity": "旅館チェックイン", "description": "祇園の静かな宿で休息。"}
            ]
          },
          {
            "day": 2,
            "title": "嵐山の朝と帰路",
            "activities": [
              {"time": "07:00", "activity": "嵐山竹林の道", "description": "早朝なら人も少なく、幻想的な雰囲気を独り占めできます。"},
              {"time": "09:00", "activity": "天龍寺", "description": "世界遺産の庭園を朝の清々しい空気の中で鑑賞。"},
              {"time": "11:00", "activity": "嵯峨野散策・帰路", "description": "お土産を探しながら駅へ向かいます。"}
            ]
          }
        ],
        "reference_indices": [0, 2]
      }

      EXAMPLE 2 (目的地が未定の場合):
      User Request: "国内、のんびり温泉、夫婦旅行、2泊3日"
      Output (JSON):
      {
        "reasoning": "夫婦でのんびりできる温泉地として、混雑を避けられる湯布院を選択。由布岳の景色と個室露天風呂のある宿が条件に合致。観光地化されすぎず、大人が落ち着いて過ごせる雰囲気。",
        "id": "yufuin-onsen-relaxation-2024",
        "destination": "湯布院",
        "heroImage": null,
        "description": "由布岳の麓で過ごす、大人の温泉旅。喧騒から離れ、二人だけの静かな時間をお過ごしください。",
        "days": [
          {
            "day": 1,
            "title": "湯布院到着・温泉街散策",
            "activities": [
              {"time": "14:00", "activity": "湯布院駅到着", "description": "特急ゆふいんの森で到着。駅舎も風情があります。"},
              {"time": "15:00", "activity": "湯の坪街道散策", "description": "おしゃれな雑貨店やカフェが並ぶメインストリート。"},
              {"time": "17:00", "activity": "旅館チェックイン", "description": "客室露天風呂付きの宿で、由布岳を眺めながらゆっくり。"},
              {"time": "19:00", "activity": "旅館で夕食", "description": "地元の食材を使った懐石料理を堪能。"}
            ]
          },
          {
            "day": 2,
            "title": "自然と芸術を楽しむ",
            "activities": [
              {"time": "09:00", "activity": "金鱗湖散策", "description": "朝霧が立ち込める幻想的な湖畔を散歩。"},
              {"time": "11:00", "activity": "由布院ステンドグラス美術館", "description": "ヨーロッパのアンティークステンドグラスを鑑賞。"},
              {"time": "13:00", "activity": "地元カフェでランチ", "description": "湯布院野菜を使ったヘルシーランチ。"},
              {"time": "15:00", "activity": "旅館で温泉三昧", "description": "貸切風呂や露天風呂でリラックス。"}
            ]
          },
          {
            "day": 3,
            "title": "別府経由で帰路",
            "activities": [
              {"time": "10:00", "activity": "チェックアウト・別府へ移動", "description": "バスで約50分の別府温泉へ。"},
              {"time": "11:30", "activity": "別府地獄めぐり", "description": "海地獄や血の池地獄など、独特の温泉景観を見学。"},
              {"time": "14:00", "activity": "別府駅から帰路", "description": "お土産に温泉コスメや地獄蒸しプリンを。"}
            ]
          }
        ],
        "reference_indices": []
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

    // User request as a separate message
    const userRequest = `
      USER REQUEST:
      ${prompt}
    `;

    try {
      console.log(
        `[gemini] Request prepared. Sending to Google Generative AI...`
      );
      const startTime = Date.now();
      const result = await this.model.generateContent({
        contents: [
          {
            role: "user",
            parts: [{ text: systemInstruction }]
          },
          {
            role: "model",
            parts: [{ text: "理解しました。ご指示に従って旅行プランを生成します。" }]
          },
          {
            role: "user",
            parts: [{ text: userRequest }]
          }
        ],
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
      const result = await this.model.generateContent({
        contents: [{ role: "user", parts: [{ text: systemPrompt }] }],
        generationConfig: {
          responseMimeType: "application/json",
          temperature: 0.3,
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
