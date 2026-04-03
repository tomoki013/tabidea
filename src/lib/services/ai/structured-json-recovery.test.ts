import { z } from 'zod';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { LanguageModelV1 } from 'ai';

const mockStreamText = vi.fn();

vi.mock('ai', () => ({
  streamText: mockStreamText,
}));

import {
  parseTextJsonObjectDetailed,
  recoverTextJson,
  salvageIncompleteJson,
  TextJsonParseError,
} from './structured-json-recovery';

function createStreamTextResult(text: string) {
  return {
    textStream: (async function* generate() {
      yield text;
    })(),
  };
}

describe('salvageIncompleteJson', () => {
  it('returns null when no JSON present', () => {
    expect(salvageIncompleteJson('The travel plan for Kanazawa')).toBeNull();
  });

  it('returns null for empty input', () => {
    expect(salvageIncompleteJson('')).toBeNull();
  });

  it('salvages lone opening brace via optimistic close', () => {
    expect(salvageIncompleteJson('{')).toBe('{}');
  });

  it('salvages truncated after opening days array', () => {
    const result = salvageIncompleteJson('{"days":[');
    expect(result).not.toBeNull();
    expect(JSON.parse(result!)).toEqual({ days: [] });
  });

  it('salvages truncated mid-stop (complete string values preserved)', () => {
    // All string values are complete — optimistic close adds closers
    const input =
      '{"days":[{"day":1,"mainArea":"A","overnightLocation":"B","stops":[{"name":"X","searchQuery":"Y"';
    const result = salvageIncompleteJson(input);
    expect(result).not.toBeNull();
    const parsed = JSON.parse(result!);
    expect(parsed.days).toHaveLength(1);
    expect(parsed.days[0].day).toBe(1);
    expect(parsed.days[0].mainArea).toBe('A');
    // Stop preserved with available fields (Zod validation happens separately)
    expect(parsed.days[0].stops).toHaveLength(1);
    expect(parsed.days[0].stops[0].name).toBe('X');
  });

  it('salvages truncated after complete day 1, mid-day 2 (conservative rewind)', () => {
    const day1 =
      '{"day":1,"mainArea":"金沢","overnightLocation":"金沢駅","stops":[{"name":"兼六園","searchQuery":"Kenrokuen","role":"must_visit","timeSlotHint":"morning","areaHint":"金沢中心"}]}';
    const input = `{"days":[${day1},{"day":2,"mainArea":"東茶屋`;
    const result = salvageIncompleteJson(input);
    expect(result).not.toBeNull();
    const parsed = JSON.parse(result!);
    // Conservative rewind cuts at day 1's closing }, dropping incomplete day 2
    expect(parsed.days).toHaveLength(1);
    expect(parsed.days[0].day).toBe(1);
    expect(parsed.days[0].mainArea).toBe('金沢');
  });

  it('salvages truncated after comma between stops (conservative rewind)', () => {
    const stop1 =
      '{"name":"兼六園","searchQuery":"Kenrokuen","role":"must_visit","timeSlotHint":"morning","areaHint":"金沢中心"}';
    const input = `{"days":[{"day":1,"mainArea":"金沢","overnightLocation":"金沢駅","stops":[${stop1},`;
    const result = salvageIncompleteJson(input);
    expect(result).not.toBeNull();
    const parsed = JSON.parse(result!);
    expect(parsed.days).toHaveLength(1);
    expect(parsed.days[0].stops).toHaveLength(1);
    expect(parsed.days[0].stops[0].name).toBe('兼六園');
  });

  it('salvages truncated mid-string value (optimistic peel-back)', () => {
    const input = '{"days":[{"day":1,"mainArea":"金沢市';
    const result = salvageIncompleteJson(input);
    expect(result).not.toBeNull();
    const parsed = JSON.parse(result!);
    // Optimistic: truncates incomplete string, peels dangling key, closes
    expect(parsed.days).toHaveLength(1);
    expect(parsed.days[0].day).toBe(1);
  });

  it('preserves two complete days when third is truncated', () => {
    const day1 =
      '{"day":1,"mainArea":"金沢","overnightLocation":"金沢駅","stops":[{"name":"兼六園","searchQuery":"Kenrokuen","role":"must_visit","timeSlotHint":"morning","areaHint":"A"}]}';
    const day2 =
      '{"day":2,"mainArea":"東茶屋","overnightLocation":"金沢駅","stops":[{"name":"東茶屋街","searchQuery":"Higashi Chaya","role":"recommended","timeSlotHint":"morning","areaHint":"B"}]}';
    const input = `{"days":[${day1},${day2},{"day":3,"mainArea":"近江町`;
    const result = salvageIncompleteJson(input);
    expect(result).not.toBeNull();
    const parsed = JSON.parse(result!);
    expect(parsed.days).toHaveLength(2);
    expect(parsed.days[0].day).toBe(1);
    expect(parsed.days[1].day).toBe(2);
  });

  it('preserves complete stops when last stop is truncated', () => {
    const stop1 =
      '{"name":"兼六園","searchQuery":"Kenrokuen","role":"must_visit","timeSlotHint":"morning","areaHint":"A"}';
    const stop2 =
      '{"name":"金沢城","searchQuery":"Kanazawa Castle","role":"recommended","timeSlotHint":"midday","areaHint":"B"}';
    const input = `{"days":[{"day":1,"mainArea":"金沢","overnightLocation":"金沢駅","stops":[${stop1},${stop2},{"name":"近江町市場","searchQuery":"Omicho`;
    const result = salvageIncompleteJson(input);
    expect(result).not.toBeNull();
    const parsed = JSON.parse(result!);
    expect(parsed.days).toHaveLength(1);
    expect(parsed.days[0].stops).toHaveLength(2);
    expect(parsed.days[0].stops[0].name).toBe('兼六園');
    expect(parsed.days[0].stops[1].name).toBe('金沢城');
  });

  it('handles escaped quotes in strings', () => {
    const input =
      '{"days":[{"day":1,"mainArea":"金沢\\"市内","overnightLocation":"B","stops":[]}';
    // Missing outer } — stops ] completed so conservative rewind fires
    const result = salvageIncompleteJson(input);
    expect(result).not.toBeNull();
    const parsed = JSON.parse(result!);
    expect(parsed.days).toHaveLength(1);
    expect(parsed.days[0].mainArea).toBe('金沢"市内');
  });

  it('handles markdown fenced JSON', () => {
    const input =
      '```json\n{"days":[{"day":1,"mainArea":"A","overnightLocation":"B","stops":[{"name":"X","search';
    const result = salvageIncompleteJson(input);
    expect(result).not.toBeNull();
    const parsed = JSON.parse(result!);
    expect(parsed.days).toHaveLength(1);
    expect(parsed.days[0].day).toBe(1);
    // Incomplete string "search stripped; stop preserved with available fields
    expect(parsed.days[0].stops).toHaveLength(1);
    expect(parsed.days[0].stops[0].name).toBe('X');
  });

  it('returns complete JSON if braces happen to balance', () => {
    const complete =
      '{"days":[{"day":1,"mainArea":"A","overnightLocation":"B","stops":[]}]}';
    const result = salvageIncompleteJson(complete);
    expect(result).not.toBeNull();
    expect(JSON.parse(result!)).toEqual(JSON.parse(complete));
  });
});

describe('parseTextJsonObjectDetailed', () => {
  const plannerSchema = z.object({
    days: z.array(z.object({
      day: z.number(),
      mainArea: z.string(),
      overnightLocation: z.string(),
      stops: z.array(z.object({
        name: z.string(),
        searchQuery: z.string(),
        role: z.string(),
        timeSlotHint: z.string(),
        areaHint: z.string(),
      })),
    })),
  });

  it('returns salvage metadata when incomplete JSON can be deterministically closed', () => {
    const day1 =
      '{"day":1,"mainArea":"金沢","overnightLocation":"金沢駅","stops":[{"name":"兼六園","searchQuery":"Kenrokuen","role":"must_visit","timeSlotHint":"morning","areaHint":"A"}]}';
    const input = `{"days":[${day1},{"day":2,"mainArea":"東茶屋`;

    const result = parseTextJsonObjectDetailed(plannerSchema, input);

    expect(result.salvageApplied).toBe(true);
    expect(result.object.days).toHaveLength(1);
    expect(result.extractedJson).toContain('"day":1');
  });

  it('keeps extractedJson and salvage flags on parse errors', () => {
    const input =
      '{"days":[{"day":1,"mainArea":"A","overnightLocation":"B","stops":[{"name":"X","searchQuery":"Y"';

    expect(() => parseTextJsonObjectDetailed(plannerSchema, input)).toThrowError(TextJsonParseError);

    try {
      parseTextJsonObjectDetailed(plannerSchema, input);
    } catch (error) {
      expect(error).toBeInstanceOf(TextJsonParseError);
      const parseError = error as TextJsonParseError;
      expect(parseError.salvageApplied).toBe(true);
      expect(parseError.extractedJson).not.toBeNull();
      expect(parseError.rawText).toBe(input);
    }
  });
});

describe('recoverTextJson', () => {
  beforeEach(() => {
    mockStreamText.mockReset();
  });

  it('uses slots-specific recovery instructions for draft outlines', async () => {
    const outlineSchema = z.object({
      day: z.number(),
      slots: z.array(z.object({
        slotIndex: z.number(),
        role: z.string(),
        timeSlotHint: z.string(),
      })),
    });

    mockStreamText.mockResolvedValueOnce(createStreamTextResult(JSON.stringify({
      day: 1,
      slots: [
        {
          slotIndex: 1,
          role: 'meal',
          timeSlotHint: 'midday',
        },
      ],
    })));

    const result = await recoverTextJson({
      resolveModel: async () => ({ provider: 'mock-model' }) as LanguageModelV1,
      modelName: 'mock-model',
      llmSchema: outlineSchema,
      system: 'outline system',
      prompt: 'outline prompt',
      sourceText: '{"day":1,"stops":[{"name":"近江町市場","role":"meal","timeSlotHint":"midday"}',
      temperature: 0.4,
      maxTokens: 900,
      fallbackLabel: 'outline-test',
      recoveryMode: 'draft_outline',
    });

    expect(result.usedTextRecovery).toBe(true);
    expect(result.object.slots[0]?.slotIndex).toBe(1);
    expect(mockStreamText).toHaveBeenCalledTimes(1);
    expect(mockStreamText.mock.calls[0]?.[0]).toMatchObject({
      maxTokens: 768,
      temperature: 0.5,
    });
    expect(mockStreamText.mock.calls[0]?.[0]?.prompt).toContain('"slots"');
    expect(mockStreamText.mock.calls[0]?.[0]?.prompt).toContain('slotIndex は 1 からの連番');
    expect(mockStreamText.mock.calls[0]?.[0]?.prompt).not.toContain('day 用 JSON オブジェクト');
  });
});
