import { z } from 'zod';
import type { LanguageModelV1 } from 'ai';

export type StructuredRecoveryMode =
  | 'semantic_plan'
  | 'semantic_seed'
  | 'semantic_day'
  | 'draft_plan'
  | 'draft_seed'
  | 'draft_outline'
  | 'draft_day'
  | 'draft_compact';

export interface StructuredJsonGenerationInput<T> {
  resolveModel: () => Promise<LanguageModelV1>;
  resolveFallbackModel?: () => Promise<LanguageModelV1>;
  modelName: string;
  fallbackModelName?: string;
  llmSchema: z.ZodType<T>;
  system: string;
  prompt: string;
  temperature: number;
  maxTokens: number;
  maxRetries?: number;
  timeoutMs?: number;
  fallbackLabel: string;
  recoveryMode?: StructuredRecoveryMode;
  recoveryTimeoutMs?: number;
}

export interface StructuredJsonGenerationResult<T> {
  object: T;
  usedTextRecovery: boolean;
}

export class TextJsonParseError extends Error {
  rawText: string;
  extractedJson: string | null;
  salvageApplied: boolean;

  constructor(
    message: string,
    rawText: string,
    options?: {
      cause?: unknown;
      extractedJson?: string | null;
      salvageApplied?: boolean;
    },
  ) {
    super(message, options);
    this.name = 'TextJsonParseError';
    this.rawText = rawText;
    this.extractedJson = options?.extractedJson ?? null;
    this.salvageApplied = options?.salvageApplied ?? false;
  }
}

export interface ParsedTextJsonObjectResult<T> {
  object: T;
  extractedJson: string;
  salvageApplied: boolean;
}

interface GeneratedTextResult {
  text: string;
  timedOut: boolean;
}

export interface TextJsonGenerationInput<T> {
  resolveModel: () => Promise<LanguageModelV1>;
  modelName: string;
  llmSchema: z.ZodType<T>;
  system: string;
  prompt: string;
  temperature: number;
  maxTokens: number;
  timeoutMs?: number;
  fallbackLabel: string;
  recoveryMode?: StructuredRecoveryMode;
  recoveryTimeoutMs?: number;
}

export interface TextJsonRecoveryInput<T> extends TextJsonGenerationInput<T> {
  sourceText: string;
}

const VALID_TIME_SLOTS = new Set(['morning', 'midday', 'afternoon', 'evening', 'night', 'flexible']);
const VALID_ROLES = new Set(['must_visit', 'recommended', 'meal', 'accommodation', 'filler']);

const RECITATION_AVOIDANCE_INSTRUCTION = `

【重要】すべてのフィールド内容は完全にオリジナルの文章で記述すること。
- 固有名詞（スポット名・エリア名・駅名）はそのまま使ってよい
- description, summary, rationale などの説明文は自分の言葉で書く
- 既存の旅行ガイドブック・ブログ・Wikipediaの表現をそのまま使わない
- 汎用的な旅行ガイドの常套句を避け、ユーザー条件に基づいた具体的な説明にする`;

export async function generateStructuredJsonWithRecovery<T>(
  input: StructuredJsonGenerationInput<T>,
): Promise<StructuredJsonGenerationResult<T>> {
  const {
    resolveModel,
    resolveFallbackModel,
    modelName,
    fallbackModelName,
    llmSchema,
    system,
    prompt,
    temperature,
    maxTokens,
    maxRetries = 0,
    timeoutMs,
    fallbackLabel,
    recoveryMode = 'semantic_plan',
    recoveryTimeoutMs = getDefaultRecoveryTimeoutMs(recoveryMode),
  } = input;

  const { generateObject } = await import('ai');
  const model = await resolveModel();

  try {
    const result = await generateObject({
      model,
      schema: llmSchema,
      system,
      prompt,
      temperature,
      maxTokens,
      maxRetries,
      abortSignal: timeoutMs ? AbortSignal.timeout(timeoutMs) : undefined,
    });

    return {
      object: result.object as T,
      usedTextRecovery: false,
    };
  } catch (error) {
    const recitation = isRecitationError(error);

    if (!recitation && !isMalformedStructuredOutputError(error)) {
      throw error;
    }

    if (recitation && resolveFallbackModel && fallbackModelName && fallbackModelName !== modelName) {
      console.warn(
        `[structured-json-recovery] ${fallbackLabel}: RECITATION detected, retrying with fallback model ${fallbackModelName}`,
      );

      try {
        const { generateObject: generateObjectWithFallback } = await import('ai');
        const fallbackModel = await resolveFallbackModel();
        const result = await generateObjectWithFallback({
          model: fallbackModel,
          schema: llmSchema,
          system,
          prompt: prompt + RECITATION_AVOIDANCE_INSTRUCTION,
          temperature: Math.min(temperature + 0.2, 1.0),
          maxTokens,
          maxRetries: 0,
          abortSignal: timeoutMs ? AbortSignal.timeout(timeoutMs) : undefined,
        });

        return {
          object: result.object as T,
          usedTextRecovery: false,
        };
      } catch (fallbackError) {
        console.warn(
          `[structured-json-recovery] ${fallbackLabel}: fallback model also failed`,
          summarizeRecoveryError(fallbackError),
        );
      }
    }

    const diagnostics = extractMalformedStructuredOutputDiagnostics(error);
    console.warn(
      `[structured-json-recovery] ${fallbackLabel}: structured output JSON was malformed, retrying with compact text recovery`,
      diagnostics,
    );

    let lastRecoveryError: unknown = error;
    const recoveryStartedAt = Date.now();

    for (const attempt of buildTextRecoveryAttempts(recoveryMode, maxTokens)) {
      try {
        const remainingRecoveryMs = recoveryTimeoutMs - (Date.now() - recoveryStartedAt);
        if (remainingRecoveryMs <= 0) {
          throw new Error(`recovery budget exhausted before ${attempt.label}`);
        }

        const recoveredText = await generateTextWithTimeout({
          model,
          system: buildTextRecoverySystem(system, attempt.compact),
          prompt: buildTextRecoveryPrompt(prompt, attempt.compact, recoveryMode),
          temperature: Math.min(temperature + 0.1, 1.0),
          maxTokens: attempt.maxTokens,
          maxRetries: 0,
        }, remainingRecoveryMs, fallbackLabel, attempt.label);

        const parsed = parseTextJsonObjectDetailed(llmSchema, recoveredText.text);
        return {
          object: parsed.object,
          usedTextRecovery: true,
        };
      } catch (recoveryError) {
        lastRecoveryError = recoveryError;
        console.warn(
          `[structured-json-recovery] ${fallbackLabel}: ${attempt.label} failed`,
          summarizeRecoveryError(recoveryError),
        );
      }
    }

    throw new Error(`${fallbackLabel}: recovered JSON was still invalid after compact retry`, {
      cause: lastRecoveryError,
    });
  }
}

export async function generateTextJsonWithRecovery<T>(
  input: TextJsonGenerationInput<T>,
): Promise<StructuredJsonGenerationResult<T>> {
  const initialText = await generateTextJsonText(input);

  try {
    const parsed = parseTextJsonObjectDetailed(input.llmSchema, initialText);
    return {
      object: parsed.object,
      usedTextRecovery: false,
    };
  } catch (error) {
    console.warn(
      `[structured-json-recovery] ${input.fallbackLabel}: text JSON parse/validation failed, retrying with compact text recovery`,
      summarizeRecoveryError(error),
    );
  }

  return recoverTextJson({
    ...input,
    sourceText: initialText,
  });
}

export async function generateTextJsonText<T>(
  input: TextJsonGenerationInput<T>,
): Promise<string> {
  const {
    resolveModel,
    system,
    prompt,
    temperature,
    maxTokens,
    timeoutMs,
    fallbackLabel,
    recoveryMode = 'draft_plan',
    recoveryTimeoutMs = getDefaultRecoveryTimeoutMs(recoveryMode),
  } = input;

  const model = await resolveModel();
  const initialResult = await generateTextWithTimeout({
    model,
    system,
    prompt,
    temperature,
    maxTokens,
    maxRetries: 0,
  }, timeoutMs ?? recoveryTimeoutMs, fallbackLabel, 'text json generation');

  if (initialResult.timedOut && initialResult.text.trim().length > 0) {
    console.warn(
      `[structured-json-recovery] ${fallbackLabel}: planner text timed out but partial output was captured, continuing with parser-side salvage`,
      { length: initialResult.text.length },
    );
  }

  return initialResult.text;
}

export async function recoverTextJson<T>(
  input: TextJsonRecoveryInput<T>,
): Promise<StructuredJsonGenerationResult<T>> {
  const {
    resolveModel,
    llmSchema,
    system,
    prompt,
    sourceText,
    temperature,
    maxTokens,
    fallbackLabel,
    recoveryMode = 'draft_plan',
    recoveryTimeoutMs = getDefaultRecoveryTimeoutMs(recoveryMode),
  } = input;

  const model = await resolveModel();
  const recoveryAttempt = buildTextRecoveryAttempts(recoveryMode, maxTokens)[0];
  if (!recoveryAttempt) {
    throw new Error(`${fallbackLabel}: no text recovery attempt configured`);
  }

  const recoveredText = await generateTextWithTimeout({
    model,
    system: buildTextRecoverySystem(system, recoveryAttempt.compact),
    prompt: buildTextRecoveryPrompt(prompt, recoveryAttempt.compact, recoveryMode, sourceText),
    temperature: Math.min(temperature + 0.1, 1.0),
    maxTokens: recoveryAttempt.maxTokens,
    maxRetries: 0,
  }, recoveryTimeoutMs, fallbackLabel, recoveryAttempt.label);

  try {
    const parsed = parseTextJsonObjectDetailed(llmSchema, recoveredText.text);
    return {
      object: parsed.object,
      usedTextRecovery: true,
    };
  } catch (error) {
    if (recoveredText.timedOut) {
      throw new Error(`${recoveryAttempt.label} timed out after ${recoveryTimeoutMs}ms for ${fallbackLabel}`, {
        cause: error,
      });
    }

    throw error;
  }
}

function getDefaultRecoveryTimeoutMs(recoveryMode: StructuredRecoveryMode): number {
  switch (recoveryMode) {
    case 'draft_plan':
      return 4_000;
    case 'draft_seed':
    case 'semantic_seed':
      return 3_000;
    case 'draft_outline':
    case 'draft_day':
    case 'semantic_day':
      return 3_000;
    case 'draft_compact':
      return 4_000;
    case 'semantic_plan':
    default:
      return 5_000;
  }
}

interface TextRecoveryAttempt {
  label: string;
  compact: boolean;
  maxTokens: number;
}

function buildTextRecoveryAttempts(
  recoveryMode: StructuredRecoveryMode,
  maxTokens: number,
): TextRecoveryAttempt[] {
  const compactMaxTokens = recoveryMode === 'draft_outline'
    ? Math.min(maxTokens, 768)
    : recoveryMode === 'draft_day' || recoveryMode === 'semantic_day'
    ? Math.min(maxTokens, 1024)
    : recoveryMode === 'draft_seed' || recoveryMode === 'semantic_seed'
      ? Math.min(maxTokens, 1536)
      : recoveryMode === 'draft_plan'
        ? Math.min(maxTokens, 2048)
      : Math.min(maxTokens, 2048);

  return [
    {
      label: 'compact text recovery',
      compact: true,
      maxTokens: compactMaxTokens,
    },
  ];
}

function buildTextRecoverySystem(system: string, compact: boolean): string {
  return `${system}

Return ONLY one valid JSON object. Do not add markdown fences or commentary.
If you are close to token limits, shorten descriptive strings instead of truncating JSON.

ENUM CONSTRAINTS (must use exact values):
- timeSlotHint: "morning" | "midday" | "afternoon" | "evening" | "night" | "flexible"
- role: "must_visit" | "recommended" | "meal" | "accommodation" | "filler"
- indoorOutdoor: "indoor" | "outdoor" | "both"

Keep all string fields concise.
${compact ? 'Prefer the minimum schema that still validates. Omit optional fields, tags, and long rationales unless strictly necessary.' : 'Keep optional fields short and only include them when they improve routing quality.'}`;
}

async function generateTextWithTimeout(
  request: {
    model: LanguageModelV1;
    system: string;
    prompt: string;
    temperature: number;
    maxTokens: number;
    maxRetries: number;
  },
  timeoutMs: number,
  fallbackLabel: string,
  attemptLabel: string,
) : Promise<GeneratedTextResult> {
  const { streamText } = await import('ai');
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  const abortController = new AbortController();
  let didTimeout = false;
  let text = '';

  try {
    timeoutId = setTimeout(() => {
      didTimeout = true;
      abortController.abort();
    }, timeoutMs);

    const result = await streamText({
      ...request,
      abortSignal: abortController.signal,
    });

    for await (const delta of result.textStream) {
      text += delta;
    }

    if (didTimeout) {
      if (text.trim().length > 0) {
        return {
          text,
          timedOut: true,
        };
      }

      throw new Error(`${attemptLabel} timed out after ${timeoutMs}ms for ${fallbackLabel}`);
    }

    return {
      text,
      timedOut: false,
    };
  } catch (error) {
    if (didTimeout && text.trim().length > 0) {
      return {
        text,
        timedOut: true,
      };
    }

    if (didTimeout) {
      throw new Error(`${attemptLabel} timed out after ${timeoutMs}ms for ${fallbackLabel}`, {
        cause: error,
      });
    }

    throw error;
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  }
}

function buildTextRecoveryPrompt(
  prompt: string,
  compact: boolean,
  recoveryMode: StructuredRecoveryMode,
  sourceText?: string,
): string {
  if (compact && recoveryMode === 'draft_outline' && sourceText) {
    return `この不完全な day outline JSON を修正し完成させてください。
目標: day と slots を持つ 1 日ぶんの JSON オブジェクト。
スキーマ: { "day": number, "slots": [{ "slotIndex", "role", "timeSlotHint", "areaHint?" }] }

必須ルール:
- JSON オブジェクトのみ返す
- day と slots の required fields を満たす
- slots の各要素は slotIndex, role, timeSlotHint を必ず持つ
- slotIndex は 1 からの連番にする
- role=meal を少なくとも 1 件含める
- timeSlotHint は morning/midday/afternoon/evening/night/flexible のいずれか
- role は must_visit/recommended/meal/accommodation/filler のいずれか
- 不完全な末尾は削除し、必ず最後の "}" まで閉じる
- 文字列は短く保つ

## 前回の不完全出力
${sourceText.slice(0, 4000)}`;
  }

  if (compact && recoveryMode === 'draft_plan' && sourceText) {
    const expectedDayCount = extractExpectedDayCount(prompt);
    const dayGoalLine = expectedDayCount
      ? `目標: ${expectedDayCount}日分の days 配列。`
      : '目標: 完全な days 配列を持つ JSON オブジェクト。';

    return `この不完全な JSON を修正し完成させてください。
${dayGoalLine}
スキーマ: { "days": [{ "day", "mainArea", "overnightLocation", "stops": [{ "name", "searchQuery", "role", "timeSlotHint", "areaHint" }] }] }

必須ルール:
- JSON オブジェクトのみ返す
- days/stops の required fields を満たす
- timeSlotHint は morning/midday/afternoon/evening/night/flexible のいずれか
- role は must_visit/recommended/meal/accommodation/filler のいずれか
- 不完全な末尾は削除し、必ず最後の "}" まで閉じる
- 文字列は短く保つ

## 前回の不完全出力
${sourceText.slice(0, 4000)}`;
  }

  const baseInstructions = recoveryMode === 'draft_outline'
    ? '重要: 出力は day outline 用 JSON オブジェクトのみ。slots は required fields を優先し、slotIndex/role/timeSlotHint だけでもよい。'
    : recoveryMode === 'draft_day'
    ? '重要: 出力は day 用 JSON オブジェクトのみ。stops は required fields を優先し、optional fields は原則省略する。'
    : recoveryMode === 'draft_seed'
      ? '重要: 出力は seed 用 JSON オブジェクトのみ。days は required fields を優先し、description と tripIntentSummary は短く保つ。'
      : recoveryMode === 'draft_plan'
        ? '重要: 出力は canonical planner 用 JSON オブジェクトのみ。days/stops の required fields を優先し、day では day/mainArea/overnightLocation/stops、stop では name/searchQuery/role/timeSlotHint/areaHint だけを返す。'
        : recoveryMode === 'draft_compact'
          ? '重要: 出力は compact all-days 用 JSON オブジェクトのみ。days と stops は required fields を優先し、説明は短く保つ。'
        : recoveryMode === 'semantic_seed'
          ? '重要: 出力は seed 用 JSON オブジェクトのみ。dayStructure は required fields を優先し、補助配列は短く保つ。'
          : recoveryMode === 'semantic_day'
            ? '重要: 出力は day 用 JSON オブジェクトのみ。candidates は required fields を優先し、optional fields は原則省略する。'
            : '重要: 出力は semantic plan 用 JSON オブジェクトのみ。required fields を優先し、補助配列と説明は短く保つ。';

  const compactModeInstructions = compact
    ? '\nさらに圧縮モード: optional fields は基本的に省略し、description/summary/rationale は短文にする。必ず最後の閉じ波括弧 "}" まで出力し、途中で切らないこと。'
    : '\n必ず最後の閉じ波括弧 "}" まで出力し、途中で文章を切らないこと。';

  const priorOutputSection = sourceText
    ? `\n## 前回の不完全出力\n${sourceText.slice(0, 4000)}\n`
    : '';

  return `${prompt}${priorOutputSection}

${baseInstructions}
${compactModeInstructions}
timeSlotHint は morning/midday/afternoon/evening/night/flexible のいずれか。role は must_visit/recommended/meal/accommodation/filler のいずれか。`;
}

function coerceTimeSlotHint(value: unknown): string {
  if (typeof value === 'string' && VALID_TIME_SLOTS.has(value)) return value;
  if (typeof value !== 'string') return 'flexible';

  const hourMatch = value.match(/(\d{1,2})[:時]/);
  if (hourMatch) {
    const hour = parseInt(hourMatch[1], 10);
    if (hour < 11) return 'morning';
    if (hour < 14) return 'midday';
    if (hour < 17) return 'afternoon';
    if (hour < 21) return 'evening';
    return 'night';
  }

  return 'flexible';
}

function coerceRole(value: unknown): string {
  if (typeof value === 'string' && VALID_ROLES.has(value)) return value;
  return 'recommended';
}

function coerceSlot(slot: unknown): unknown {
  if (!slot || typeof slot !== 'object') {
    return slot;
  }

  const slotRecord = { ...(slot as Record<string, unknown>) };
  slotRecord.timeSlotHint = coerceTimeSlotHint(slotRecord.timeSlotHint);
  slotRecord.role = coerceRole(slotRecord.role);
  return slotRecord;
}

function coerceRecoveredJson(data: unknown): unknown {
  if (!data || typeof data !== 'object') {
    return data;
  }

  const record = data as Record<string, unknown>;

  if (Array.isArray(record.stops)) {
    record.stops = record.stops.map((stop) => coerceStop(stop));
  }

  if (Array.isArray(record.slots)) {
    record.slots = record.slots.map((slot) => coerceSlot(slot));
  }

  if (Array.isArray(record.days)) {
    record.days = record.days.map((day, index) => {
      if (!day || typeof day !== 'object') {
        return day;
      }

      const dayRecord = { ...(day as Record<string, unknown>) };
      dayRecord.day = typeof dayRecord.day === 'number' ? dayRecord.day : index + 1;
      if (Array.isArray(dayRecord.stops)) {
        dayRecord.stops = dayRecord.stops.map((stop) => coerceStop(stop));
      }
      return dayRecord;
    });
  }

  return record;
}

export function parseTextJsonObject<T>(llmSchema: z.ZodType<T>, text: string): T {
  return parseTextJsonObjectDetailed(llmSchema, text).object;
}

export function parseTextJsonObjectDetailed<T>(
  llmSchema: z.ZodType<T>,
  text: string,
): ParsedTextJsonObjectResult<T> {
  let extractedJson = extractFirstJsonObject(text);
  let salvageApplied = false;
  if (!extractedJson) {
    extractedJson = salvageIncompleteJson(text);
    salvageApplied = extractedJson !== null;
  }
  if (!extractedJson) {
    throw new TextJsonParseError(
      'model returned text but no complete JSON object could be extracted',
      text,
      {
        extractedJson: null,
        salvageApplied: false,
      },
    );
  }

  try {
    const parsed = JSON.parse(extractedJson);
    const coerced = coerceRecoveredJson(parsed);
    return {
      object: llmSchema.parse(coerced) as T,
      extractedJson,
      salvageApplied,
    };
  } catch (error) {
    throw new TextJsonParseError(
      error instanceof Error ? error.message : 'text JSON parse failed',
      text,
      {
        cause: error,
        extractedJson,
        salvageApplied,
      },
    );
  }
}

function extractExpectedDayCount(prompt: string): number | null {
  const patterns = [
    /days は (\d+) 日ぶん必ず返す/u,
    /日数:\s*(\d+)日/u,
  ];

  for (const pattern of patterns) {
    const match = prompt.match(pattern);
    const value = match?.[1] ? Number.parseInt(match[1], 10) : Number.NaN;
    if (Number.isFinite(value) && value > 0) {
      return value;
    }
  }

  return null;
}

function coerceStop(stop: unknown): unknown {
  if (!stop || typeof stop !== 'object') {
    return stop;
  }

  const stopRecord = { ...(stop as Record<string, unknown>) };
  stopRecord.timeSlotHint = coerceTimeSlotHint(stopRecord.timeSlotHint);
  stopRecord.role = coerceRole(stopRecord.role);
  return stopRecord;
}

function isMalformedStructuredOutputError(error: unknown): boolean {
  const messages = collectErrorMessages(error);
  return messages.some((message) =>
    /unterminated string|unexpected end of json|json at position|jsonparse|ai_jsonparseerror|invalid json|expected .*[,}\]]|recitation|finishReason.*RECITATION|content.*role.*required|content.*parts.*required/i.test(message),
  );
}

function isRecitationError(error: unknown): boolean {
  const messages = collectErrorMessages(error);
  return messages.some((message) =>
    /recitation|finishReason.*RECITATION|resembles existing copyrighted/i.test(message),
  );
}

function collectErrorMessages(error: unknown): string[] {
  const visited = new Set<unknown>();
  const queue: unknown[] = [error];
  const messages: string[] = [];

  while (queue.length > 0) {
    const current = queue.shift();
    if (!current || visited.has(current)) {
      continue;
    }
    visited.add(current);

    if (typeof current === 'string') {
      messages.push(current);
      continue;
    }

    if (current instanceof Error) {
      messages.push(current.message);
      queue.push((current as Error & { cause?: unknown }).cause);
    }

    if (typeof current === 'object') {
      const candidate = current as Record<string, unknown>;
      if (typeof candidate.message === 'string') {
        messages.push(candidate.message);
      }
      if (typeof candidate.text === 'string') {
        messages.push(candidate.text);
      }
      if ('cause' in candidate) {
        queue.push(candidate.cause);
      }
      if ('value' in candidate) {
        queue.push(candidate.value);
      }
    }
  }

  return messages;
}

function summarizeRecoveryError(error: unknown): Record<string, unknown> {
  if (error instanceof Error) {
    return { message: error.message };
  }

  return { message: typeof error === 'string' ? error : 'unknown_error' };
}

function extractMalformedStructuredOutputDiagnostics(error: unknown): Record<string, unknown> {
  const text = extractMalformedOutputText(error);
  return {
    messages: collectErrorMessages(error).slice(0, 3),
    rawTextLength: text?.length ?? 0,
    rawTextSample: text ? sanitizeMalformedOutputSample(text) : undefined,
  };
}

function extractMalformedOutputText(error: unknown): string | undefined {
  const visited = new Set<unknown>();
  const queue: unknown[] = [error];

  while (queue.length > 0) {
    const current = queue.shift();
    if (!current || visited.has(current)) {
      continue;
    }
    visited.add(current);

    if (typeof current === 'object') {
      const candidate = current as Record<string, unknown>;
      if (typeof candidate.text === 'string' && candidate.text.trim()) {
        return candidate.text;
      }
      if (typeof candidate.value === 'string' && candidate.value.trim()) {
        return candidate.value;
      }
      if ('cause' in candidate) {
        queue.push(candidate.cause);
      }
    }
  }

  return undefined;
}

function sanitizeMalformedOutputSample(text: string): string {
  return text.replace(/\s+/g, ' ').slice(0, 200);
}

function extractFirstJsonObject(source: string): string | null {
  const start = source.indexOf('{');
  if (start < 0) {
    return null;
  }

  let depth = 0;
  let inString = false;
  let escaping = false;

  for (let index = start; index < source.length; index += 1) {
    const char = source[index];

    if (inString) {
      if (escaping) {
        escaping = false;
      } else if (char === '\\') {
        escaping = true;
      } else if (char === '"') {
        inString = false;
      }
      continue;
    }

    if (char === '"') {
      inString = true;
      continue;
    }

    if (char === '{') {
      depth += 1;
      continue;
    }

    if (char === '}') {
      depth -= 1;
      if (depth === 0) {
        return source.slice(start, index + 1);
      }
    }
  }

  return null;
}

/**
 * Attempt to salvage incomplete JSON by rewinding to the last complete
 * element and closing all open constructs.
 *
 * Called when `extractFirstJsonObject` returns null (unbalanced braces).
 * This is a deterministic, zero-latency operation — runs before any AI recovery.
 *
 * Two strategies, tried in order:
 * 1. Conservative rewind — cut at the last `}` or `]` that completed an
 *    element, then close remaining constructs. This drops any partially
 *    written sibling elements (e.g., incomplete day/stop objects).
 * 2. Optimistic close — strip trailing incomplete tokens (partial strings,
 *    dangling colons/commas) then close remaining constructs. Handles cases
 *    like `{"days":[` where no element has completed yet.
 */
export function salvageIncompleteJson(source: string): string | null {
  const start = source.indexOf('{');
  if (start < 0) {
    return null;
  }

  const stack: ('{' | '[')[] = [];
  let inString = false;
  let escaping = false;

  // Position right after the last `}` or `]` that reduced depth.
  // Only closures update this — commas inside nested incomplete objects
  // are intentionally ignored to avoid capturing partial siblings.
  let lastClosureEnd = -1;
  let stackAtClosure: ('{' | '[')[] = [];

  for (let index = start; index < source.length; index += 1) {
    const char = source[index];

    if (inString) {
      if (escaping) {
        escaping = false;
      } else if (char === '\\') {
        escaping = true;
      } else if (char === '"') {
        inString = false;
      }
      continue;
    }

    if (char === '"') {
      inString = true;
      continue;
    }

    if (char === '{') {
      stack.push('{');
      continue;
    }

    if (char === '[') {
      stack.push('[');
      continue;
    }

    if (char === '}') {
      if (stack.length === 0) break;
      stack.pop();
      if (stack.length === 0) {
        // Fully balanced — extractFirstJsonObject should have caught this
        return source.slice(start, index + 1);
      }
      lastClosureEnd = index + 1;
      stackAtClosure = [...stack];
      continue;
    }

    if (char === ']') {
      if (stack.length === 0) break;
      stack.pop();
      lastClosureEnd = index + 1;
      stackAtClosure = [...stack];
      continue;
    }
  }

  // Strategy 1: Conservative rewind — cut at last complete element closure
  if (lastClosureEnd > start) {
    const result = buildClosedJson(
      source.slice(start, lastClosureEnd),
      stackAtClosure,
    );
    if (result) return result;
  }

  // Strategy 2: Optimistic close — strip trailing partial content, then close
  return buildOptimisticClose(source, start);
}

/** Take a JSON prefix, remove trailing comma, and close remaining constructs. */
function buildClosedJson(
  prefix: string,
  remainingStack: ('{' | '[')[],
): string | null {
  let text = prefix.replace(/,\s*$/, '');
  for (let i = remainingStack.length - 1; i >= 0; i -= 1) {
    text += remainingStack[i] === '{' ? '}' : ']';
  }
  try {
    JSON.parse(text);
    return text;
  } catch {
    return null;
  }
}

/**
 * Strip trailing incomplete tokens, recount the stack, and close remaining
 * constructs. Uses an iterative peel-back: first handle incomplete strings,
 * then strip dangling syntax, then try to close. If JSON.parse fails (e.g.
 * a dangling key without a value), strip one more trailing token and retry.
 */
function buildOptimisticClose(source: string, jsonStart: number): string | null {
  let text = source.slice(jsonStart);

  // Phase 1: if inside an incomplete string, truncate to before it
  {
    let inStr = false;
    let esc = false;
    let lastStringStart = -1;

    for (let i = 0; i < text.length; i += 1) {
      const c = text[i];
      if (inStr) {
        if (esc) esc = false;
        else if (c === '\\') esc = true;
        else if (c === '"') inStr = false;
        continue;
      }
      if (c === '"') {
        inStr = true;
        lastStringStart = i;
      }
    }

    if (inStr && lastStringStart >= 0) {
      text = text.slice(0, lastStringStart);
    }
  }

  // Phase 2: iteratively strip trailing noise and try to close
  const MAX_PEEL = 6;
  for (let attempt = 0; attempt < MAX_PEEL; attempt += 1) {
    text = text.replace(/[,:\s]+$/, '');

    const result = recountAndClose(text);
    if (result) return result;

    // Peel one more trailing token: a quoted string, number, or keyword
    const peeled = text.replace(/"[^"]*"\s*$/, '');
    if (peeled !== text) {
      text = peeled;
      continue;
    }
    const peeledWord = text.replace(/[\w.]+\s*$/, '');
    if (peeledWord !== text) {
      text = peeledWord;
      continue;
    }
    break; // nothing more to peel
  }

  return null;
}

/** Recount the open-construct stack from scratch, close remaining, and validate. */
function recountAndClose(text: string): string | null {
  const stack: ('{' | '[')[] = [];
  let inStr = false;
  let esc = false;

  for (let i = 0; i < text.length; i += 1) {
    const c = text[i];
    if (inStr) {
      if (esc) esc = false;
      else if (c === '\\') esc = true;
      else if (c === '"') inStr = false;
      continue;
    }
    if (c === '"') {
      inStr = true;
      continue;
    }
    if (c === '{') stack.push('{');
    else if (c === '[') stack.push('[');
    else if (c === '}' && stack.length > 0) stack.pop();
    else if (c === ']' && stack.length > 0) stack.pop();
  }

  if (stack.length === 0 || inStr) return null;

  let result = text;
  for (let i = stack.length - 1; i >= 0; i -= 1) {
    result += stack[i] === '{' ? '}' : ']';
  }

  try {
    JSON.parse(result);
    return result;
  } catch {
    return null;
  }
}
