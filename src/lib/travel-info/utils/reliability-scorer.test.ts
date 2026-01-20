/**
 * 信頼性スコアラーのテスト
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  ReliabilityScorer,
  createReliabilityScorer,
  calculateCrossValidation,
  calculateFieldCrossValidation,
  BASE_RELIABILITY_SCORES,
  EXTENDED_BASE_SCORES,
  RELIABILITY_DISPLAY,
  RELIABILITY_THRESHOLDS,
  interpretReliabilityScore,
} from './reliability-scorer';
import { TravelInfoSource } from '@/types';

describe('ReliabilityScorer', () => {
  let scorer: ReliabilityScorer;

  beforeEach(() => {
    scorer = createReliabilityScorer();
  });

  describe('calculateScore', () => {
    it('official_apiソースは高スコアを返す', () => {
      const source: Pick<TravelInfoSource, 'sourceType' | 'retrievedAt'> = {
        sourceType: 'official_api',
        retrievedAt: new Date(),
      };

      const score = scorer.calculateScore(source);
      expect(score).toBeGreaterThanOrEqual(90);
    });

    it('ai_generatedソースは低スコアを返す', () => {
      const source: Pick<TravelInfoSource, 'sourceType' | 'retrievedAt'> = {
        sourceType: 'ai_generated',
        retrievedAt: new Date(),
      };

      const score = scorer.calculateScore(source);
      expect(score).toBeLessThanOrEqual(60);
    });

    it('古い情報は減衰する', () => {
      const recentSource: Pick<TravelInfoSource, 'sourceType' | 'retrievedAt'> = {
        sourceType: 'official_api',
        retrievedAt: new Date(),
      };

      const oldSource: Pick<TravelInfoSource, 'sourceType' | 'retrievedAt'> = {
        sourceType: 'official_api',
        retrievedAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // 24時間前
      };

      const recentScore = scorer.calculateScore(recentSource);
      const oldScore = scorer.calculateScore(oldSource);

      expect(recentScore).toBeGreaterThan(oldScore);
    });

    it('クロスバリデーションでスコアが上がる', () => {
      const source: Pick<TravelInfoSource, 'sourceType' | 'retrievedAt'> = {
        sourceType: 'web_search',
        retrievedAt: new Date(),
      };

      const baseScore = scorer.calculateScore(source);
      const boostedScore = scorer.calculateScore(source, {
        crossValidation: 1.0,
      });

      expect(boostedScore).toBeGreaterThan(baseScore);
    });

    it('ソース評判でスコアが変動する', () => {
      const source: Pick<TravelInfoSource, 'sourceType' | 'retrievedAt'> = {
        sourceType: 'web_search',
        retrievedAt: new Date(),
      };

      const lowRepScore = scorer.calculateScore(source, {
        sourceReputation: 0.2,
      });
      const highRepScore = scorer.calculateScore(source, {
        sourceReputation: 0.8,
      });

      expect(highRepScore).toBeGreaterThan(lowRepScore);
    });

    it('スコアは10-100の範囲内に収まる', () => {
      // 非常に古いソース（低スコアになる）
      const oldSource: Pick<TravelInfoSource, 'sourceType' | 'retrievedAt'> = {
        sourceType: 'blog',
        retrievedAt: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000),
      };

      const score = scorer.calculateScore(oldSource);
      expect(score).toBeGreaterThanOrEqual(10);
      expect(score).toBeLessThanOrEqual(100);
    });
  });

  describe('calculateAggregateScore', () => {
    it('複数ソースの集約スコアを計算する', () => {
      const sources: TravelInfoSource[] = [
        {
          sourceType: 'official_api',
          sourceName: 'MOFA',
          retrievedAt: new Date(),
          reliabilityScore: 95,
        },
        {
          sourceType: 'web_search',
          sourceName: 'Google',
          retrievedAt: new Date(),
          reliabilityScore: 60,
        },
      ];

      const aggregateScore = scorer.calculateAggregateScore(sources);
      expect(aggregateScore).toBeGreaterThan(0);
      expect(aggregateScore).toBeLessThanOrEqual(100);
    });

    it('空の配列では0を返す', () => {
      const score = scorer.calculateAggregateScore([]);
      expect(score).toBe(0);
    });
  });

  describe('rankSources', () => {
    it('ソースを信頼性順にランク付けする', () => {
      const sources: TravelInfoSource[] = [
        {
          sourceType: 'blog',
          sourceName: 'Blog',
          retrievedAt: new Date(),
          reliabilityScore: 40,
        },
        {
          sourceType: 'official_api',
          sourceName: 'MOFA',
          retrievedAt: new Date(),
          reliabilityScore: 95,
        },
        {
          sourceType: 'web_search',
          sourceName: 'Google',
          retrievedAt: new Date(),
          reliabilityScore: 60,
        },
      ];

      const ranked = scorer.rankSources(sources);

      expect(ranked[0].sourceType).toBe('official_api');
      expect(ranked[1].sourceType).toBe('web_search');
      expect(ranked[2].sourceType).toBe('blog');
    });
  });

  describe('getReliabilityLevel', () => {
    it('80以上はhighを返す', () => {
      expect(scorer.getReliabilityLevel(80)).toBe('high');
      expect(scorer.getReliabilityLevel(100)).toBe('high');
    });

    it('60-79はmediumを返す', () => {
      expect(scorer.getReliabilityLevel(60)).toBe('medium');
      expect(scorer.getReliabilityLevel(79)).toBe('medium');
    });

    it('40-59はlowを返す', () => {
      expect(scorer.getReliabilityLevel(40)).toBe('low');
      expect(scorer.getReliabilityLevel(59)).toBe('low');
    });

    it('40未満はuncertainを返す', () => {
      expect(scorer.getReliabilityLevel(39)).toBe('uncertain');
      expect(scorer.getReliabilityLevel(10)).toBe('uncertain');
    });
  });

  describe('getReliabilityDisplay', () => {
    it('信頼性の表示情報を返す', () => {
      const display = scorer.getReliabilityDisplay(85);

      expect(display.label).toBe('信頼性: 高');
      expect(display.color).toBe('green');
      expect(display.icon).toBe('CheckCircle');
    });
  });

  describe('calculateFreshness', () => {
    it('新しい情報は高い鮮度を返す', () => {
      const freshness = scorer.calculateFreshness(new Date(), 'safety');
      expect(freshness).toBeGreaterThan(0.9);
    });

    it('古い情報は低い鮮度を返す', () => {
      const oldDate = new Date(Date.now() - 12 * 60 * 60 * 1000); // 12時間前
      const freshness = scorer.calculateFreshness(oldDate, 'safety');
      expect(freshness).toBeLessThan(0.5);
    });
  });
});

describe('クロスバリデーション', () => {
  describe('calculateCrossValidation', () => {
    it('すべて一致する場合は1を返す', () => {
      const values = ['tokyo', 'tokyo', 'tokyo'];
      const score = calculateCrossValidation(values);
      expect(score).toBe(1);
    });

    it('すべて異なる場合は0を返す', () => {
      const values = ['tokyo', 'paris', 'london'];
      const score = calculateCrossValidation(values);
      expect(score).toBe(0);
    });

    it('部分的に一致する場合は中間値を返す', () => {
      const values = ['tokyo', 'tokyo', 'paris'];
      const score = calculateCrossValidation(values);
      expect(score).toBeGreaterThan(0);
      expect(score).toBeLessThan(1);
    });

    it('1つ以下の値では0を返す', () => {
      expect(calculateCrossValidation(['tokyo'])).toBe(0);
      expect(calculateCrossValidation([])).toBe(0);
    });

    it('カスタム等価関数を使用できる', () => {
      const values = [
        { code: 'JPY' },
        { code: 'JPY' },
        { code: 'USD' },
      ];
      const score = calculateCrossValidation(
        values,
        (a, b) => a.code === b.code
      );
      expect(score).toBeGreaterThan(0);
    });
  });

  describe('calculateFieldCrossValidation', () => {
    it('ネストされたフィールドで一致度を計算する', () => {
      const data = [
        { currency: { code: 'JPY' } },
        { currency: { code: 'JPY' } },
        { currency: { code: 'JPY' } },
      ];
      const score = calculateFieldCrossValidation(data, 'currency.code');
      expect(score).toBe(1);
    });
  });
});

describe('定数', () => {
  describe('BASE_RELIABILITY_SCORES', () => {
    it('全ソースタイプのスコアが定義されている', () => {
      expect(BASE_RELIABILITY_SCORES.official_api).toBeDefined();
      expect(BASE_RELIABILITY_SCORES.web_search).toBeDefined();
      expect(BASE_RELIABILITY_SCORES.ai_generated).toBeDefined();
      expect(BASE_RELIABILITY_SCORES.blog).toBeDefined();
    });

    it('official_apiが最高スコア', () => {
      expect(BASE_RELIABILITY_SCORES.official_api).toBeGreaterThan(
        BASE_RELIABILITY_SCORES.web_search
      );
      expect(BASE_RELIABILITY_SCORES.official_api).toBeGreaterThan(
        BASE_RELIABILITY_SCORES.ai_generated
      );
    });
  });

  describe('EXTENDED_BASE_SCORES', () => {
    it('拡張ソースタイプのスコアが定義されている', () => {
      expect(EXTENDED_BASE_SCORES.official_web).toBeDefined();
      expect(EXTENDED_BASE_SCORES.commercial).toBeDefined();
      expect(EXTENDED_BASE_SCORES.news).toBeDefined();
      expect(EXTENDED_BASE_SCORES.unknown).toBeDefined();
    });
  });

  describe('RELIABILITY_DISPLAY', () => {
    it('全レベルの表示情報が定義されている', () => {
      expect(RELIABILITY_DISPLAY.high).toBeDefined();
      expect(RELIABILITY_DISPLAY.medium).toBeDefined();
      expect(RELIABILITY_DISPLAY.low).toBeDefined();
      expect(RELIABILITY_DISPLAY.uncertain).toBeDefined();
    });

    it('日本語ラベルが含まれている', () => {
      expect(RELIABILITY_DISPLAY.high.label).toContain('信頼性');
      expect(RELIABILITY_DISPLAY.high.description).toBeTruthy();
    });
  });

  describe('RELIABILITY_THRESHOLDS', () => {
    it('閾値が適切に設定されている', () => {
      expect(RELIABILITY_THRESHOLDS.high).toBe(80);
      expect(RELIABILITY_THRESHOLDS.medium).toBe(60);
      expect(RELIABILITY_THRESHOLDS.low).toBe(40);
    });
  });
});

describe('後方互換性', () => {
  describe('interpretReliabilityScore', () => {
    it('高スコアを正しく解釈する', () => {
      const result = interpretReliabilityScore(85);
      expect(result.level).toBe('high');
      expect(result.label).toBe('高信頼性');
    });

    it('中スコアを正しく解釈する', () => {
      const result = interpretReliabilityScore(65);
      expect(result.level).toBe('medium');
      expect(result.label).toBe('中信頼性');
    });

    it('低スコアを正しく解釈する', () => {
      const result = interpretReliabilityScore(40);
      expect(result.level).toBe('low');
      expect(result.label).toBe('低信頼性');
    });
  });
});
