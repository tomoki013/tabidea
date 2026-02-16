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
  PlanOutlineDayParsed,
} from './schemas/itinerary-schemas';
import {
  selectModel,
  extractComplexity,
  getTemperature,
  type ModelSelectionInput,
  type RequestComplexity,
  type GenerationPhase,
} from './model-selector';
import { resolveModelForProvider, resolveProvider, type ProviderName } from './model-provider';
import { executeOutlineStrategy, executeDetailsStrategy, getModifyProvider } from './strategies/orchestrator';
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
const RETRY_DELAY_MS = 500;
/** Per-attempt timeout for generateObject calls (60 seconds) */
const GENERATION_TIMEOUT_MS = 60_000;

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
  if (!transit) return transit as unknown as TransitInfoParsed;

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
  // Base activity object with strict type cast (omit source/searchQuery since they differ between Input and Parsed)
  const baseActivity = { ...activity } as Omit<ActivityInput, 'source' | 'searchQuery'> & { searchQuery?: string };

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
    timelineItems: normalizedTimelineItems as DayPlan['timelineItems'],
  };
}

// ============================================
// GeminiService
// ============================================

export class GeminiService implements AIService {
  private options: GeminiServiceOptions;
  private _lastModelInfo: { modelName: string; tier: 'flash' | 'pro' } | null = null;

  constructor(options: GeminiServiceOptions = {}) {
    this.options = options;
    console.log(`[ai-service] Service initialized`);
    if (options.premiumAiStatus?.hasAccess) {
      console.log(`[ai-service] Premium AI access enabled`);
    }
  }

  /**
   * 指定されたフェーズに適したモデルを選択
   */
  private getModel(phase: GenerationPhase, complexity?: RequestComplexity, providerOverride?: ProviderName) {
    const provider = providerOverride || resolveProvider('itinerary');

    const input: ModelSelectionInput = {
      premiumAiStatus: this.options.premiumAiStatus,
      userPrefersPro: this.options.userPrefersPro,
      complexity: complexity || this.options.complexity,
      phase,
      provider,
    };

    const selection = selectModel(input);
    this._lastModelInfo = { modelName: selection.modelName, tier: selection.tier as 'flash' | 'pro' };

    const resolved = resolveModelForProvider(provider, 'itinerary', {
      modelName: selection.modelName,
      structuredOutputs: true,
    });

    return {
      model: resolved.model,
      temperature: selection.temperature,
      modelName: resolved.modelName,
      tier: selection.tier,
      provider: resolved.provider,
    };
  }

  /** 最後に使用されたモデルの情報を取得 */
  get lastModelInfo(): { modelName: string; tier: 'flash' | 'pro' } | null {
    return this._lastModelInfo;
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
          maxTokens: 4096,
          abortSignal: AbortSignal.timeout(GENERATION_TIMEOUT_MS),
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

  /**
   * Internal: Modify itinerary with a specific provider
   */
  private async _modifyItinerarySingle(
    currentPlan: Itinerary,
    chatHistory: { role: string; text: string }[],
    providerOverride?: ProviderName,
  ): Promise<Itinerary> {
    const conversationHistory = chatHistory
      .map((m) => `${m.role === "user" ? "USER" : "AI (Assistant)"}: ${m.text}`)
      .join("\n\n");

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

    const { model, temperature, modelName } = this.getModel('modify', undefined, providerOverride);
    console.log(`[ai-service] Modify using model: ${modelName}, temperature: ${temperature}`);

    const result = await withRetry(async () => {
      const { object } = await generateObject({
        model,
        schema: ItinerarySchema,
        prompt,
        temperature,
        maxTokens: 8192,
        abortSignal: AbortSignal.timeout(GENERATION_TIMEOUT_MS),
      });
      return object;
    });

    const references = result.references || currentPlan.references;

    return {
      ...result,
      heroImage: result.heroImage ?? currentPlan.heroImage,
      heroImagePhotographer: result.heroImagePhotographer ?? currentPlan.heroImagePhotographer,
      heroImagePhotographerUrl: result.heroImagePhotographerUrl ?? currentPlan.heroImagePhotographerUrl,
      references,
    } as Itinerary;
  }

  async modifyItinerary(
    currentPlan: Itinerary,
    chatHistory: { role: string; text: string }[]
  ): Promise<Itinerary> {
    console.log(`[ai-service] Modifying itinerary based on chat history...`);

    try {
      // Pipeline: use modify provider if full strategy
      const modifyProvider = getModifyProvider();
      return await this._modifyItinerarySingle(currentPlan, chatHistory, modifyProvider);
    } catch (error) {
      console.error("Failed to modify itinerary", error);
      throw new Error(
        `旅程の修正に失敗しました。しばらくしてから再度お試しください。`
      );
    }
  }

  /**
   * Build the full outline prompt (shared by single and race strategies)
   */
  private buildOutlinePrompt(prompt: string, context: Article[]): string {
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

    return `${sandwichSystem}\n\n${outlineInstructions}\n\nUSER REQUEST:\n${sandwichUser}`;
  }

  /**
   * Internal: Generate outline with a specific provider (single call)
   */
  private async _generateOutlineSingle(
    prompt: string,
    context: Article[],
    complexity?: RequestComplexity,
    providerOverride?: ProviderName,
  ): Promise<PlanOutline> {
    const fullPrompt = this.buildOutlinePrompt(prompt, context);

    const { model, temperature, modelName } = this.getModel('outline', complexity, providerOverride);
    console.log(`[ai-service] Outline using model: ${modelName}, temperature: ${temperature}`);

    const result = await withRetry(async () => {
      const { object } = await generateObject({
        model,
        schema: PlanOutlineSchema,
        prompt: fullPrompt,
        temperature,
        maxTokens: 2048,
        abortSignal: AbortSignal.timeout(GENERATION_TIMEOUT_MS),
      });
      return object;
    });

    const normalizedDays = result.days.map((day: PlanOutlineDayParsed, index: number) => ({
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
  }

  /**
   * Step 1: Generate Master Outline
   * Uses orchestrator to apply the configured strategy (full or single).
   */
  async generateOutline(
    prompt: string,
    context: Article[],
    complexity?: RequestComplexity
  ): Promise<PlanOutline> {
    console.log(`[ai-service] Generating Plan Outline...`);

    try {
      const result = await executeOutlineStrategy(
        this.buildOutlinePrompt(prompt, context),
        context,
        complexity,
        // Single generation callback
        async (_prompt, _context, _complexity, providerOverride) => {
          return this._generateOutlineSingle(prompt, context, _complexity, providerOverride);
        },
        // Modify callback for cross-review corrections
        async (currentPlan, chatHistory, providerOverride) => {
          return this._modifyItinerarySingle(currentPlan as Itinerary, chatHistory, providerOverride);
        },
      );

      return result.outline;
    } catch (error) {
      console.error("[ai-service] Outline generation failed:", error);
      throw new Error(
        `旅程アウトラインの生成に失敗しました。しばらくしてから再度お試しください。`
      );
    }
  }

  /**
   * Internal: Build the day details prompt
   */
  private buildDayDetailsPrompt(
    prompt: string,
    context: Article[],
    startDay: number,
    endDay: number,
    outlineDays: PlanOutlineDay[],
    startingLocation?: string,
  ): string {
    const outlineInfo = JSON.stringify(outlineDays);

    const { systemInstruction: sandwichSystem, userPrompt: sandwichUser } = buildContextSandwich({
      context,
      goldenPlanExamples: this.options.goldenPlanExamples,
      travelInfo: this.options.travelInfo,
      userPrompt: prompt,
      generationType: 'dayDetails',
    });

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

      CORE RULES:
      1. Follow "highlight_areas" and "overnight_location" from the outline for each day.
      2. Create activities (3 meals + sightseeing spots) fitting the user's pace.
      3. Each day MUST start from previous day's overnight_location (or startingLocation if specified).
      4. TRANSIT: If travel_method_to_next is set for the PREVIOUS day, generate a "transit" object with type/departure/arrival/duration/memo. Transit goes at the BEGINNING of the day.
      5. For international trips: include departure/return flights as "transit" objects (not activities).
      6. ui_type: "compact" (heavy transit/many activities), "narrative" (relaxed/cultural), "default" (standard sightseeing).

      ACTIVITY FIELDS:
      - activityType: "spot" (sightseeing), "meal" (restaurants), "transit" (movement), "accommodation" (hotel), "other" (free time)
      - locationEn: "City, Country" format (e.g., "Kyoto, Japan")
      - source: { type: "ai_knowledge", confidence: "medium" } if not from context

      QUALITY:
      - Write like a human travel writer. Engaging, atmospheric, practical descriptions.
      - Geographic continuity: no teleporting. Include realistic travel between cities.
      - For multi-city trips: smooth transitions with check-out, transport details, and check-in.

      TIMELINE ITEMS:
      - Generate "timelineItems" array interleaving transit and activities chronologically.
      - Each item: { itemType: "activity"|"transit", data: Activity|TransitInfo, time: string }.
    `;

    return `${sandwichSystem}\n\n${detailInstructions}\n\nUSER REQUEST:\n${sandwichUser}`;
  }

  /**
   * Internal: Generate day details with a specific provider (single call)
   */
  private async _generateDayDetailsSingle(
    prompt: string,
    context: Article[],
    startDay: number,
    endDay: number,
    outlineDays: PlanOutlineDay[],
    startingLocation?: string,
    complexity?: RequestComplexity,
    providerOverride?: ProviderName,
  ): Promise<DayPlan[]> {
    const fullPrompt = this.buildDayDetailsPrompt(prompt, context, startDay, endDay, outlineDays, startingLocation);

    const { model, temperature, modelName } = this.getModel('details', complexity, providerOverride);
    console.log(`[ai-service] Details using model: ${modelName}, temperature: ${temperature}`);

    const result = await withRetry(async () => {
      const { object } = await generateObject({
        model,
        schema: DayPlanArrayResponseInputSchema,
        prompt: fullPrompt,
        temperature,
        maxTokens: 4096,
        abortSignal: AbortSignal.timeout(GENERATION_TIMEOUT_MS),
      });
      return object;
    });

    const normalizedDays = result.days.map(normalizeDayPlan);
    return normalizedDays as DayPlan[];
  }

  /**
   * Step 2: Generate Detailed Activities for specific days based on Outline.
   * Uses orchestrator to apply the configured strategy (full or single).
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
    console.log(`[ai-service] Generating details for days ${startDay}-${endDay}...`);
    if (startingLocation) {
      console.log(`[ai-service] Starting location context: ${startingLocation}`);
    }

    try {
      // Extract destination from outline for cross-review
      const destination = outlineDays[0]?.overnight_location || 'unknown';

      const result = await executeDetailsStrategy(
        prompt,
        context,
        startDay,
        endDay,
        outlineDays,
        startingLocation,
        destination,
        complexity,
        // Single generation callback
        async (_prompt, _context, _startDay, _endDay, _outlineDays, _startingLocation, _complexity, providerOverride) => {
          return this._generateDayDetailsSingle(prompt, context, _startDay, _endDay, _outlineDays, _startingLocation, _complexity, providerOverride);
        },
        // Modify callback for cross-review corrections
        async (currentPlan, chatHistory, providerOverride) => {
          return this._modifyItinerarySingle(currentPlan as Itinerary, chatHistory, providerOverride);
        },
      );

      return result.days;
    } catch (error) {
      console.error(`[ai-service] Detail generation failed for days ${startDay}-${endDay}:`, error);
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
