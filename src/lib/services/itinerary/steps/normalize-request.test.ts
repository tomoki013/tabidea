import { describe, it, expect } from 'vitest';
import { normalizeRequest } from './normalize-request';
import type { UserInput } from '@/types/user-input';

const makeInput = (overrides: Partial<UserInput>): UserInput => ({
  destinations: ['東京'],
  region: 'domestic',
  dates: '3日間',
  companions: '友達',
  theme: ['グルメ'],
  budget: 'standard',
  pace: 'balanced',
  freeText: '',
  ...overrides,
});

describe('normalizeRequest', () => {
  // ==============================
  // Duration parsing
  // ==============================
  describe('Japanese date parsing', () => {
    it('parses "3日間" → 3', () => {
      const result = normalizeRequest(makeInput({ dates: '3日間' }));
      expect(result.durationDays).toBe(3);
    });

    it('parses "2泊3日" → 3', () => {
      const result = normalizeRequest(makeInput({ dates: '2泊3日' }));
      expect(result.durationDays).toBe(3);
    });

    it('parses "1泊2日" → 2', () => {
      const result = normalizeRequest(makeInput({ dates: '1泊2日' }));
      expect(result.durationDays).toBe(2);
    });

    it('parses "10日間" → 10', () => {
      const result = normalizeRequest(makeInput({ dates: '10日間' }));
      expect(result.durationDays).toBe(10);
    });
  });

  describe('English date parsing', () => {
    it('parses "3 days" → 3', () => {
      const result = normalizeRequest(makeInput({ dates: '3 days' }));
      expect(result.durationDays).toBe(3);
    });

    it('parses "5 nights" → 6', () => {
      const result = normalizeRequest(makeInput({ dates: '5 nights' }));
      expect(result.durationDays).toBe(6);
    });

    it('parses "1 day" → 1 (singular)', () => {
      const result = normalizeRequest(makeInput({ dates: '1 day' }));
      expect(result.durationDays).toBe(1);
    });

    it('parses "5-day" → 5', () => {
      const result = normalizeRequest(makeInput({ dates: '5-day' }));
      expect(result.durationDays).toBe(5);
    });

    it('parses bare number "4" → 4', () => {
      const result = normalizeRequest(makeInput({ dates: '4' }));
      expect(result.durationDays).toBe(4);
    });

    it('parses "half day" → 1', () => {
      const result = normalizeRequest(makeInput({ dates: 'half day' }));
      expect(result.durationDays).toBe(1);
    });

    it('defaults to 1 for unrecognized input', () => {
      const result = normalizeRequest(makeInput({ dates: 'some random text' }));
      expect(result.durationDays).toBe(1);
    });
  });

  // ==============================
  // Budget normalization
  // ==============================
  describe('budget normalization', () => {
    it('normalizes "格安" → "budget"', () => {
      const result = normalizeRequest(makeInput({ budget: '格安' }));
      expect(result.budgetLevel).toBe('budget');
    });

    it('normalizes "standard" → "standard"', () => {
      const result = normalizeRequest(makeInput({ budget: 'standard' }));
      expect(result.budgetLevel).toBe('standard');
    });

    it('normalizes "luxury" → "luxury"', () => {
      const result = normalizeRequest(makeInput({ budget: 'luxury' }));
      expect(result.budgetLevel).toBe('luxury');
    });

    it('normalizes empty string → "standard"', () => {
      const result = normalizeRequest(makeInput({ budget: '' }));
      expect(result.budgetLevel).toBe('standard');
    });

    it('normalizes "贅沢" → "luxury"', () => {
      const result = normalizeRequest(makeInput({ budget: '贅沢' }));
      expect(result.budgetLevel).toBe('luxury');
    });

    it('normalizes "少し贅沢" → "premium"', () => {
      const result = normalizeRequest(makeInput({ budget: '少し贅沢' }));
      expect(result.budgetLevel).toBe('premium');
    });

    it('normalizes unknown budget → "standard"', () => {
      const result = normalizeRequest(makeInput({ budget: 'unknown-value' }));
      expect(result.budgetLevel).toBe('standard');
    });
  });

  // ==============================
  // Pace normalization
  // ==============================
  describe('pace normalization', () => {
    it('normalizes "ゆったり" → "relaxed"', () => {
      const result = normalizeRequest(makeInput({ pace: 'ゆったり' }));
      expect(result.pace).toBe('relaxed');
    });

    it('normalizes "active" → "active"', () => {
      const result = normalizeRequest(makeInput({ pace: 'active' }));
      expect(result.pace).toBe('active');
    });

    it('normalizes empty string → "balanced"', () => {
      const result = normalizeRequest(makeInput({ pace: '' }));
      expect(result.pace).toBe('balanced');
    });

    it('normalizes "のんびり" → "relaxed"', () => {
      const result = normalizeRequest(makeInput({ pace: 'のんびり' }));
      expect(result.pace).toBe('relaxed');
    });

    it('normalizes "充実" → "active"', () => {
      const result = normalizeRequest(makeInput({ pace: '充実' }));
      expect(result.pace).toBe('active');
    });

    it('normalizes unknown pace → "balanced"', () => {
      const result = normalizeRequest(makeInput({ pace: 'unknown' }));
      expect(result.pace).toBe('balanced');
    });
  });

  // ==============================
  // Transport normalization
  // ==============================
  describe('transport normalization', () => {
    it('normalizes ["電車"] → ["public_transit"]', () => {
      const result = normalizeRequest(makeInput({ preferredTransport: ['電車'] }));
      expect(result.preferredTransport).toEqual(['public_transit']);
    });

    it('normalizes undefined → ["public_transit"]', () => {
      const result = normalizeRequest(makeInput({ preferredTransport: undefined }));
      expect(result.preferredTransport).toEqual(['public_transit']);
    });

    it('normalizes empty array → ["public_transit"]', () => {
      const result = normalizeRequest(makeInput({ preferredTransport: [] }));
      expect(result.preferredTransport).toEqual(['public_transit']);
    });

    it('normalizes ["車", "徒歩"] → ["car", "walking"]', () => {
      const result = normalizeRequest(makeInput({ preferredTransport: ['車', '徒歩'] }));
      expect(result.preferredTransport).toEqual(['car', 'walking']);
    });

    it('deduplicates transport modes', () => {
      const result = normalizeRequest(
        makeInput({ preferredTransport: ['電車', 'train', 'バス'] })
      );
      expect(result.preferredTransport).toEqual(['public_transit']);
    });

    it('normalizes ["bicycle"] → ["bicycle"]', () => {
      const result = normalizeRequest(makeInput({ preferredTransport: ['bicycle'] }));
      expect(result.preferredTransport).toEqual(['bicycle']);
    });
  });

  // ==============================
  // mustVisitPlaces normalization
  // ==============================
  describe('mustVisitPlaces normalization', () => {
    it('filters empty strings', () => {
      const result = normalizeRequest(
        makeInput({ mustVisitPlaces: ['金閣寺', '', '  ', '清水寺'] })
      );
      expect(result.mustVisitPlaces).toEqual(['金閣寺', '清水寺']);
    });

    it('trims whitespace', () => {
      const result = normalizeRequest(
        makeInput({ mustVisitPlaces: ['  金閣寺  ', ' 清水寺'] })
      );
      expect(result.mustVisitPlaces).toEqual(['金閣寺', '清水寺']);
    });

    it('returns empty array for undefined', () => {
      const result = normalizeRequest(makeInput({ mustVisitPlaces: undefined }));
      expect(result.mustVisitPlaces).toEqual([]);
    });
  });

  // ==============================
  // fixedSchedule default
  // ==============================
  describe('fixedSchedule', () => {
    it('defaults to empty array when undefined', () => {
      const result = normalizeRequest(makeInput({ fixedSchedule: undefined }));
      expect(result.fixedSchedule).toEqual([]);
    });

    it('passes through fixedSchedule when provided', () => {
      const schedule = [{ type: 'flight' as const, name: 'NH123', time: '10:00' }];
      const result = normalizeRequest(makeInput({ fixedSchedule: schedule }));
      expect(result.fixedSchedule).toEqual(schedule);
    });
  });

  // ==============================
  // Start date extraction
  // ==============================
  describe('start date extraction', () => {
    it('extracts ISO date "2025-03-15" → "2025-03-15"', () => {
      const result = normalizeRequest(makeInput({ dates: '2025-03-15 3日間' }));
      expect(result.startDate).toBe('2025-03-15');
    });

    it('extracts slash date "2025/3/15" → "2025-03-15"', () => {
      const result = normalizeRequest(makeInput({ dates: '2025/3/15 3日間' }));
      expect(result.startDate).toBe('2025-03-15');
    });

    it('extracts slash date with zero-padded month "2025/03/05" → "2025-03-05"', () => {
      const result = normalizeRequest(makeInput({ dates: '2025/03/05 3日間' }));
      expect(result.startDate).toBe('2025-03-05');
    });

    it('returns undefined when no date is present', () => {
      const result = normalizeRequest(makeInput({ dates: '3日間' }));
      expect(result.startDate).toBeUndefined();
    });
  });

  // ==============================
  // Other fields
  // ==============================
  describe('other fields pass through', () => {
    it('carries over destinations, companions, themes, freeText, region', () => {
      const result = normalizeRequest(
        makeInput({
          destinations: ['京都', '大阪'],
          companions: 'カップル',
          theme: ['歴史', '自然'],
          freeText: '紅葉を見たい',
          region: 'domestic',
        })
      );
      expect(result.destinations).toEqual(['京都', '大阪']);
      expect(result.companions).toBe('カップル');
      expect(result.themes).toEqual(['歴史', '自然']);
      expect(result.freeText).toBe('紅葉を見たい');
      expect(result.region).toBe('domestic');
    });

    it('filters empty destinations', () => {
      const result = normalizeRequest(makeInput({ destinations: ['東京', '', '  '] }));
      expect(result.destinations).toEqual(['東京']);
    });

    it('defaults empty theme to ["Gourmet"]', () => {
      const result = normalizeRequest(makeInput({ theme: [] }));
      expect(result.themes).toEqual(['Gourmet']);
    });

    it('v3: sets durationMinutes from durationDays', () => {
      const result = normalizeRequest(makeInput({ dates: '3日間' }));
      expect(result.durationMinutes).toBe(3 * 840);
    });

    it('v3: sets locale from outputLanguage', () => {
      const result = normalizeRequest(makeInput({}), 'en');
      expect(result.locale).toBe('en');
    });

    it('v3: locale defaults to ja', () => {
      const result = normalizeRequest(makeInput({}));
      expect(result.locale).toBe('ja');
    });

    it('preserves originalInput reference', () => {
      const input = makeInput({});
      const result = normalizeRequest(input);
      expect(result.originalInput).toBe(input);
    });

    it('sets outputLanguage from argument', () => {
      const result = normalizeRequest(makeInput({}), 'en');
      expect(result.outputLanguage).toBe('en');
    });
  });
});
