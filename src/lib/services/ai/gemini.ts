import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { generateObject } from "ai";
import { AIService, Article } from "./types";
import { Itinerary, PlanOutline, DayPlan, PlanOutlineDay, EntitlementStatus } from '@/types';
import {
  PlanOutlineSchema,
  DayPlanArrayResponseInputSchema,
  ItinerarySchema,
  LegacyItineraryResponseSchema,
  TransitInfoParsed,
  TransitInfoInput,
  ActivityParsed,
  ActivityInput,
  DayPlanInput,
} from './schemas/itinerary-schemas';
import {
  selectModel,
  extractComplexity,
  getTemperature,
  type ModelSelectionInput,
  type RequestComplexity,
  type GenerationPhase,
} from './model-selector';
import { buildContextSandwich, type PromptBuilderOptions } from './prompt-builder';
import type { GoldenPlanExample } from '@/data/golden-plans/types';
import type { TravelInfoSnapshot } from './adapters/travel-info-adapter';

// ============================================
// Types
// ============================================

export interface GeminiServiceOptions {
  /** premium_ai 権限ステータス（サブスクユーザー判定用） */
  premiumAiStatus?: EntitlementStatus;
  /** ユーザーがProモデルを明示的に選択したか */
  userPrefersPro?: boolean;
  /** リクエストの複雑度（自動判定されない場合） */
  complexity?: RequestComplexity;
  /** Golden Planサンプル（Context Sandwich Layer 3） */
  goldenPlanExamples?: GoldenPlanExample[];
  /** 渡航情報スナップショット（Context Sandwich Layer 4） */
  travelInfo?: TravelInfoSnapshot;
}

// ============================================
// Constants
// ============================================

const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 1000;

// ============================================
// Helper Functions
// ============================================

/**
 * Delay execution for specified milliseconds
 */
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Execute with retry logic
 */
async function withRetry<T>(
  operation: () => Promise<T>,
  maxRetries: number = MAX_RETRIES,
  delayMs: number = RETRY_DELAY_MS
): Promise<T> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      console.warn(`[gemini] Attempt ${attempt + 1}/${maxRetries + 1} failed:`, lastError.message);

      if (attempt < maxRetries) {
        await delay(delayMs * (attempt + 1)); // Exponential backoff
      }
    }
  }

  throw lastError || new Error('Unknown error during retry');
}

/**
 * Normalize TransitInfo departure/arrival if they are simple strings
 */
function normalizeTransitInfo(transit: TransitInfoInput): TransitInfoParsed {
  if (!transit) return transit as any;

  const normalizeLocation = (loc: string | { place: string; time?: string }) => {
    if (typeof loc === 'string') {
      return { place: loc };
    }
    return loc;
  };

  return {
    ...transit,
    departure: normalizeLocation(transit.departure),
    arrival: normalizeLocation(transit.arrival),
  };
}

/**
 * Normalize Activity source if it is a simple string or null
 */
function normalizeActivitySource(activity: ActivityInput): ActivityParsed {
  // Base activity object with strict type cast
  const baseActivity = { ...activity } as any;

  // Handle null explicitly: convert to undefined
  if (activity.source === null || activity.source === undefined) {
    return {
      ...baseActivity,
      source: undefined,
    };
  }

  // Handle string
  if (typeof activity.source === 'string') {
    // If "ai_knowledge" or any other string, convert to object
    if (activity.source === 'ai_knowledge') {
      return {
        ...baseActivity,
        source: { type: 'ai_knowledge', confidence: 'medium' }
      };
    }
    // Default fallback
    return {
      ...baseActivity,
      source: { type: 'ai_knowledge', confidence: 'medium', title: activity.source }
    };
  }

  // Already an object (ActivitySource)
  return {
    ...baseActivity,
    source: activity.source,
  };
}

/**
 * Post-process generated day plan to normalize data structures
 */
function normalizeDayPlan(day: DayPlanInput): DayPlan {
  // Normalize main transit
  let normalizedTransit = undefined;
  if (day.transit) {
    normalizedTransit = normalizeTransitInfo(day.transit);
  }

  // Normalize activities source
  const normalizedActivities = day.activities.map(normalizeActivitySource);

  // Normalize timeline items
  const normalizedTimelineItems = day.timelineItems?.map(item => {
    if (item.itemType === 'transit') {
      return {
        ...item,
        data: normalizeTransitInfo(item.data),
      };
    } else if (item.itemType === 'activity') {
      return {
        ...item,
        data: normalizeActivitySource(item.data),
      };
    }
    return item;
  });

  return {
    ...day,
    transit: normalizedTransit,
    activities: normalizedActivities,
    timelineItems: normalizedTimelineItems as any, // Cast to any to satisfy the complex union type match
  };
}

// ============================================
// GeminiService
// ============================================

export class GeminiService implements AIService {
  private google: ReturnType<typeof createGoogleGenerativeAI>;
  private defaultModelName: string;
  private options: GeminiServiceOptions;

  constructor(apiKey: string, options: GeminiServiceOptions = {}) {
    this.google = createGoogleGenerativeAI({ apiKey });
    this.defaultModelName = process.env.GOOGLE_MODEL_NAME || "gemini-2.5-flash";
    this.options = options;
    console.log(`[gemini] Service initialized. Default model: ${this.defaultModelName}`);
    if (options.premiumAiStatus?.hasAccess) {
      console.log(`[gemini] Premium AI access enabled`);
    }
  }

  /**
   * 指定されたフェーズに適したモデルを選択
   */
  private getModel(phase: GenerationPhase, complexity?: RequestComplexity) {
    const input: ModelSelectionInput = {
      premiumAiStatus: this.options.premiumAiStatus,
      userPrefersPro: this.options.userPrefersPro,
      complexity: complexity || this.options.complexity,
      phase,
    };

    const selection = selectModel(input);

    return {
      model: this.google(selection.modelName, { structuredOutputs: true }),
      temperature: selection.temperature,
      modelName: selection.modelName,
      tier: selection.tier,
    };
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
      3. Return valid JSON matching the schema.

      The "id" should be a unique-ish identifier.
      The "description" should be compelling, mentioning if you used specific blog tips.
      The "heroImage" should be a URL from context articles if available, otherwise null.
      Each activity should have detailed descriptions in Japanese.
      "reference_indices" should only include IDs of articles RELEVANT to the destination.
    `;

    const fullPrompt = `${systemInstruction}

USER REQUEST:
${prompt}`;

    try {
      console.log(`[gemini] Request prepared. Sending to Vercel AI SDK with structured output...`);
      const startTime = Date.now();

      const { model, temperature, modelName } = this.getModel('details');
      console.log(`[gemini] Using model: ${modelName}, temperature: ${temperature}`);

      const result = await withRetry(async () => {
        const { object } = await generateObject({
          model,
          schema: LegacyItineraryResponseSchema,
          prompt: fullPrompt,
          temperature,
        });
        return object;
      });

      const endTime = Date.now();
      console.log(`[gemini] Response received in ${endTime - startTime}ms.`);

      // Quick reference processing
      const indices = result.reference_indices || [];
      const references = indices
        .map((idx: number) => context[idx])
        .filter(Boolean)
        .map((a: Article) => ({
          title: a.title,
          url: a.url,
          image: a.imageUrl || "",
          snippet: a.snippet,
        }));

      return {
        ...result,
        heroImage: result.heroImage ?? undefined,
        references,
      } as Itinerary;
    } catch (error) {
      console.error(
        "[gemini] Generation failed details:",
        error instanceof Error ? error.message : error
      );
      throw new Error(
        `旅程の生成に失敗しました。しばらくしてから再度お試しください。`
      );
    }
  }

  async modifyItinerary(
    currentPlan: Itinerary,
    chatHistory: { role: string; text: string }[]
  ): Promise<Itinerary> {
    console.log(`[gemini] Modifying itinerary based on chat history...`);

    const conversationHistory = chatHistory
      .map((m) => `${m.role === "user" ? "USER" : "AI (Assistant)"}: ${m.text}`)
      .join("\n\n");

    // Use Context Sandwich for modify (lighter version - no golden plans needed)
    const { systemInstruction: sandwichSystem } = buildContextSandwich({
      context: [],
      travelInfo: this.options.travelInfo,
      userPrompt: '',
      generationType: 'modify',
    });

    const prompt = `
        ${sandwichSystem}

        CURRENT ITINERARY JSON:
        ${JSON.stringify(currentPlan)}

        CONVERSATION HISTORY:
        ${conversationHistory}

        INSTRUCTIONS:
        1. MODIFY the Current Itinerary based on the User Feedback.
        2. KEEP all parts of the itinerary that the user did NOT ask to change EXACTLY THE SAME. Do not invent new changes.
        3. If the user asks to change a restaurant, time, or activity, update only that specific part.
        4. RETURN the FULL updated itinerary strictly following the schema.
        5. Preserve the id, heroImage, and other metadata.
     `;

    try {
      const { model, temperature, modelName } = this.getModel('modify');
      console.log(`[gemini] Using model: ${modelName}, temperature: ${temperature}`);

      const result = await withRetry(async () => {
        const { object } = await generateObject({
          model,
          schema: ItinerarySchema,
          prompt,
          temperature,
        });
        return object;
      });

      // Preserve original references if not present in new data
      const references = result.references || currentPlan.references;

      return {
        ...result,
        heroImage: result.heroImage ?? currentPlan.heroImage,
        heroImagePhotographer: result.heroImagePhotographer ?? currentPlan.heroImagePhotographer,
        heroImagePhotographerUrl: result.heroImagePhotographerUrl ?? currentPlan.heroImagePhotographerUrl,
        references,
      } as Itinerary;
    } catch (error) {
      console.error("Failed to modify itinerary", error);
      throw new Error(
        `旅程の修正に失敗しました。しばらくしてから再度お試しください。`
      );
    }
  }

  /**
   * Step 1: Generate Master Outline (No detailed activities yet)
   * Focus on selecting destination (if needed) and high-level routing.
   * IMPORTANT: This now includes overnight_location and travel_method_to_next
   * to ensure continuity between days and prevent "teleportation" bugs.
   */
  async generateOutline(
    prompt: string,
    context: Article[],
    complexity?: RequestComplexity
  ): Promise<PlanOutline> {
    console.log(`[gemini] Generating Plan Outline...`);

    // Build Context Sandwich prompt
    const { systemInstruction: sandwichSystem, userPrompt: sandwichUser } = buildContextSandwich({
      context,
      goldenPlanExamples: this.options.goldenPlanExamples,
      travelInfo: this.options.travelInfo,
      userPrompt: prompt,
      generationType: 'outline',
    });

    const outlineInstructions = `
      Rules:
      1. If destination is NOT specified, choose the BEST destination based on User Request.
      2. CRITICAL: Respect the requested "Region".
         - If Region is "Japan (Domestic)", choose a destination IN JAPAN.
         - If Region is "Overseas (International)", choose a destination OUTSIDE JAPAN. Do NOT choose Tokyo, Osaka, etc.
         - If Region is "Anywhere", choose based on Vibe.
      3. Plan the route for ALL days.
      4. For each day, list the "highlight_areas" (e.g. ["Asakusa", "Sky Tree"]).
      5. Ensure NO DUPLICATE areas across days unless necessary (e.g. return to hub).

      TONE & QUALITY INSTRUCTIONS:
      - The "description" should NOT be a dry list. It must be a **Compelling, Human-like Travel Concept**.
      - Write it like a professional travel editor pitching a feature story.
      - Evoke emotion, atmosphere, and the specific "Vibe" the user requested.
      - Avoid robotic phrases like "Here is a plan for...". Instead start with "Escape to..." or "Immerse yourself in...".

      MULTI-CITY TRIP HANDLING:
      - If multiple destinations are specified (e.g., "Tokyo、Osaka、Kyoto"), this is a multi-city trip.
      - Plan the route to visit ALL specified cities efficiently, considering travel time between them.
      - Allocate appropriate days to each city based on total trip duration.
      - Include travel/transfer days between cities when needed.
      - The "destination" field should combine all cities (e.g., "東京・大阪・京都周遊").
      - Ensure logical geographic order (e.g., Tokyo → Osaka → Kyoto, not random jumps).

      CRITICAL - OVERNIGHT LOCATION & TRAVEL CONTINUITY:
      - For EACH day, you MUST specify "overnight_location" - the city/area where the traveler will sleep that night.
      - For days that are NOT the last day, specify "travel_method_to_next" - how the traveler will get to the next day's location.
      - The next day's activities MUST start from the previous day's overnight_location.
      - This prevents "teleportation" bugs where travelers appear in different countries/cities without travel.
      - Example: If Day 1 ends in Istanbul, Day 2 MUST start in Istanbul (not suddenly in Cairo).
      - For the last day, "travel_method_to_next" should be null.
    `;

    const systemInstruction = `${sandwichSystem}\n\n${outlineInstructions}`;
    const fullPrompt = `${systemInstruction}\n\nUSER REQUEST:\n${sandwichUser}`;

    try {
      const { model, temperature, modelName } = this.getModel('outline', complexity);
      console.log(`[gemini] Using model: ${modelName}, temperature: ${temperature}`);

      const result = await withRetry(async () => {
        const { object } = await generateObject({
          model,
          schema: PlanOutlineSchema,
          prompt: fullPrompt,
          temperature,
        });
        return object;
      });

      // Normalize travel_method_to_next: convert null strings to undefined
      const normalizedDays = result.days.map((day, index) => ({
        ...day,
        travel_method_to_next:
          index === result.days.length - 1 ? undefined :
          day.travel_method_to_next ?? undefined,
      }));

      return {
        destination: result.destination,
        description: result.description,
        days: normalizedDays as PlanOutlineDay[],
      };
    } catch (error) {
      console.error("[gemini] Outline generation failed:", error);
      throw new Error(
        `旅程アウトラインの生成に失敗しました。しばらくしてから再度お試しください。`
      );
    }
  }

  /**
   * Step 2: Generate Detailed Activities for specific days based on Outline
   * IMPORTANT: Now accepts startingLocation to ensure continuity from previous chunk.
   */
  async generateDayDetails(
    prompt: string,
    context: Article[],
    startDay: number,
    endDay: number,
    outlineDays: PlanOutlineDay[],
    startingLocation?: string,
    complexity?: RequestComplexity
  ): Promise<DayPlan[]> {
    console.log(`[gemini] Generating details for days ${startDay}-${endDay}...`);
    if (startingLocation) {
      console.log(`[gemini] Starting location context: ${startingLocation}`);
    }

    // Provide ONLY relevant outline info to keep context small
    const outlineInfo = JSON.stringify(outlineDays);

    // Build Context Sandwich prompt
    const { systemInstruction: sandwichSystem, userPrompt: sandwichUser } = buildContextSandwich({
      context,
      goldenPlanExamples: this.options.goldenPlanExamples,
      travelInfo: this.options.travelInfo,
      userPrompt: prompt,
      generationType: 'dayDetails',
    });

    // Build starting location constraint if provided
    const startingLocationConstraint = startingLocation
      ? startDay === 1
        ? `
      CRITICAL - STARTING LOCATION CONSTRAINT (DAY 1):
      The traveler is arriving at or starting their trip in "${startingLocation}".
      Day 1's activities MUST take place in or near "${startingLocation}".
      This is the beginning of the trip - set the scene properly.
      Include arrival activities if appropriate (e.g., check-in, first exploration).
      `
        : `
      CRITICAL - STARTING LOCATION CONSTRAINT:
      The traveler is waking up in "${startingLocation}" on Day ${startDay}.
      Day ${startDay}'s first activity MUST be in or departing from "${startingLocation}".
      DO NOT start the day in a different city/country - this would be physically impossible.
      If travel to another location is needed, include the travel as an activity.
      `
      : "";

    const detailInstructions = `
      Create detailed itinerary for Days ${startDay} to ${endDay} in JAPANESE.

      MASTER PLAN OUTLINE (You MUST follow this):
      ${outlineInfo}
      ${startingLocationConstraint}

      Rules:
      1. Strictly follow the "highlight_areas" and "overnight_location" defined in the Master Plan Outline for each day.
      2. Create detailed activities (3 meals + spots) fitting the user's pace.
      3. Return the days array following the schema.
      4. CRITICAL: Each day MUST start from the previous day's overnight_location (or startingLocation if specified).
      5. CRITICAL - TRANSIT CARD GENERATION:
         - If travel_method_to_next is specified in the outline for the PREVIOUS day, you MUST generate a "transit" object for this day.
         - The transit object should include:
           * type: Choose from "flight", "train", "bus", "ship", "car", "other" based on the travel_method_to_next description
           * departure: Include the previous day's overnight_location and an appropriate departure time. Try to use an object { place: "...", time: "..." } but a string is acceptable if time is unknown.
           * arrival: Include this day's starting location and an appropriate arrival time. Try to use an object { place: "...", time: "..." } but a string is acceptable if time is unknown.
           * duration: Calculate realistic travel duration
           * memo: Optional details like flight numbers, train names, etc.
         - Transit should appear at the BEGINNING of the day, before other activities.
         - If there is no travel between locations, do NOT include a transit object.
      6. GENERATIVE UI SELECTION:
         - Select the best \`ui_type\` for each day based on its content:
           * "compact": For days with MANY short activities, heavy transit, or business-like schedules.
           * "narrative": For relaxed days, nature exploration, cultural immersion, or when the "vibe" is more important than the schedule.
           * "default": For standard sightseeing days with a balanced mix of spots and meals.

      QUALITY & TONE INSTRUCTIONS (IMPORTANT):
      - WRITE LIKE A HUMAN TRAVEL WRITER, not a robot.
      - Descriptions should be engaging, atmospheric, and practical.
      - Avoid repetitive sentence structures (e.g. don't start every line with "Go to...").
      - ONE-SHOT FEEL: Even though you are generating a part of the trip, write as if it flows naturally from the previous days.
      - Morning Transition: Explicitly mention the context of waking up in the starting location (e.g., "Waking up to the sounds of [Location]...").

      MULTI-CITY TRIP HANDLING:
      - If this is a multi-city trip, ensure smooth transitions between cities.
      - For travel days, include:
        - Check-out and departure activities in the morning
        - Transportation details (Shinkansen, flight, etc.) with approximate times
        - Arrival and check-in at the new destination
      - Balance the activities appropriately for travel days (fewer sightseeing spots).
      - Always mention which city each activity is in when it might be ambiguous.

      GEOGRAPHIC CONTINUITY (VERY IMPORTANT):
      - The traveler cannot teleport. If Day N ends in City A, Day N+1 MUST start in City A.
      - If moving to City B, include the actual travel (flight, train, etc.) as activities.
      - Travel time should be realistic (e.g., international flights take several hours).

      ACTIVITY TYPE CLASSIFICATION (IMPORTANT):
      - For EACH activity, set the "activityType" field to help the UI display correctly:
        * "spot" - Sightseeing, museums, temples, parks, landmarks (will show Google Places info)
        * "meal" - Restaurants, cafes, food markets (will show Google Places info)
        * "transit" - Any travel/movement between places (will NOT show Google Places info)
        * "accommodation" - Hotel check-in/check-out (will NOT show Google Places info)
        * "other" - Free time, rest, packing, etc. (will NOT show Google Places info)
      - This is CRITICAL for transit activities like "アスワン出発、砂漠を越えてアブシンベルへ" - these MUST be "transit", not "spot"

      LOCATION ENGLISH NAME (IMPORTANT):
      - For EACH activity, set the "locationEn" field to the English name of the city/area where the activity takes place.
      - Format: "City, Country" (e.g., "Aswan, Egypt", "Ubud, Bali", "Kyoto, Japan")
      - This is used for generating correct booking links. Use specific city names, not broad regions.
      - For transit activities, use the destination city name.

      FLIGHT & BUDGET INFORMATION:
      - If the trip is international/overseas, include departure and return flights as "transit" objects (NOT as activities).
      - On Day 1, generate a transit object with type "flight" for the departure from Japan to the destination.
      - On the last day, generate a transit object with type "flight" for the return to Japan.
      - These MUST use the "transit" field of DayPlan, not the "activities" array.

      TIMELINE ITEMS (時系列タイムライン):
      - Generate a "timelineItems" array for each day that interleaves transit and activities in chronological order.
      - Each item has "itemType" ("activity" or "transit") and "data" (matching Activity or TransitInfo schema).
      - Include ALL movements within the day as transit items (not just the main transit).
      - For example, if a train ride happens between two sightseeing spots, include it as a transit item.
      - Transit items should also have a "time" field for display.
      - This array allows the UI to render a unified chronological timeline.
      - "source" field in Activity MUST be an object { type: "ai_knowledge", confidence: "medium" } if not from context.
    `;

    const systemInstruction = `${sandwichSystem}\n\n${detailInstructions}`;
    const fullPrompt = `${systemInstruction}\n\nUSER REQUEST:\n${sandwichUser}`;

    try {
      const { model, temperature, modelName } = this.getModel('details', complexity);
      console.log(`[gemini] Using model: ${modelName}, temperature: ${temperature}`);

      const result = await withRetry(async () => {
        const { object } = await generateObject({
          model,
          schema: DayPlanArrayResponseInputSchema,
          prompt: fullPrompt,
          temperature,
        });
        return object;
      });

      // Post-process to normalize any string fields that should be objects
      const normalizedDays = result.days.map(normalizeDayPlan);

      // Ensure we just return the days array
      return normalizedDays as DayPlan[];
    } catch (error) {
      console.error(`[gemini] Detail generation failed for days ${startDay}-${endDay}:`, error);
      throw new Error(
        `日程詳細の生成に失敗しました（Day ${startDay}-${endDay}）。しばらくしてから再度お試しください。`
      );
    }
  }

  /**
   * ユーザー入力から複雑度を抽出するヘルパー
   */
  static extractComplexityFromUserInput(userInput: {
    destinations?: string;
    duration?: number;
    companions?: string;
    specialRequirements?: string;
  }): RequestComplexity {
    return extractComplexity(userInput);
  }

  /**
   * フェーズに対応する温度設定を取得
   */
  static getTemperatureForPhase(phase: GenerationPhase): number {
    return getTemperature(phase);
  }
}

// Re-export types for convenience
export { extractComplexity, type RequestComplexity, type GenerationPhase };
