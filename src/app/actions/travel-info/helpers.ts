/**
 * travel-info用ヘルパー関数
 */

import type {
  TravelInfoCategory,
  TravelInfoSource,
  SourceType,
} from '@/lib/types/travel-info';
import type { ParsedSource } from '@/lib/ai/schemas/travel-info-schemas';

// ============================================
// ソース関連
// ============================================

/**
 * ソースタイプの日本語名を取得
 */
export function getSourceName(type: SourceType): string {
  switch (type) {
    case 'official_api':
      return '公式情報';
    case 'web_search':
      return 'Web検索';
    case 'ai_generated':
      return 'AI生成';
    case 'blog':
      return 'ブログ記事';
    default:
      return '不明';
  }
}

/**
 * パースされたソースタイプをSourceTypeにマッピング
 */
export function mapParsedSourceTypeToSourceType(
  parsedType: 'official' | 'news' | 'commercial' | 'personal',
  fetchSourceType: SourceType
): SourceType {
  // AI生成の場合はそのままfetchSourceTypeを使用
  if (fetchSourceType === 'ai_generated') {
    return 'ai_generated';
  }

  // それ以外はパースされたタイプに基づいて判断
  switch (parsedType) {
    case 'official':
      return 'official_api';
    case 'news':
    case 'commercial':
      return 'web_search';
    case 'personal':
      return 'blog';
    default:
      return fetchSourceType;
  }
}

/**
 * ソースタイプに基づく信頼性スコア
 */
export function getReliabilityScoreByType(
  type: 'official' | 'news' | 'commercial' | 'personal'
): number {
  switch (type) {
    case 'official':
      return 95;
    case 'news':
      return 80;
    case 'commercial':
      return 70;
    case 'personal':
      return 50;
    default:
      return 60;
  }
}

/**
 * ParsedSourceをTravelInfoSourceに変換
 */
export function convertParsedSourcesToTravelInfoSources(
  parsedSources: ParsedSource[],
  fetchSourceType: SourceType
): TravelInfoSource[] {
  return parsedSources.map((source) => ({
    sourceType: mapParsedSourceTypeToSourceType(source.type, fetchSourceType),
    sourceName: source.name,
    sourceUrl: source.url || undefined,
    retrievedAt: new Date(),
    reliabilityScore: getReliabilityScoreByType(source.type),
  }));
}

/**
 * 複数ソースからの情報をマージ・重複排除
 */
export function mergeInfoSources(sources: TravelInfoSource[]): TravelInfoSource[] {
  const uniqueSources = new Map<string, TravelInfoSource>();

  for (const source of sources) {
    const key = source.sourceUrl || source.sourceName;
    const existing = uniqueSources.get(key);

    if (!existing || source.reliabilityScore > existing.reliabilityScore) {
      uniqueSources.set(key, source);
    }
  }

  // 信頼性スコア順にソート
  return Array.from(uniqueSources.values()).sort(
    (a, b) => b.reliabilityScore - a.reliabilityScore
  );
}

// ============================================
// 信頼性関連
// ============================================

/**
 * 総合信頼性スコアを計算
 */
export function calculateOverallReliability(
  confidenceScores: number[]
): number {
  if (confidenceScores.length === 0) {
    return 0;
  }

  const totalScore = confidenceScores.reduce((sum, score) => sum + score, 0);
  return Math.round(totalScore / confidenceScores.length);
}

// ============================================
// 免責事項
// ============================================

/**
 * 免責事項を生成
 */
export function generateDisclaimer(
  reliability: number,
  categories: TravelInfoCategory[]
): string {
  const hasSafetyInfo = categories.includes('safety');
  const hasVisaInfo = categories.includes('visa');

  let disclaimer =
    'この情報はAIによって生成されたものであり、正確性を保証するものではありません。';

  if (reliability < 50) {
    disclaimer +=
      '情報の信頼性が低い可能性があります。必ず公式情報をご確認ください。';
  }

  if (hasSafetyInfo) {
    disclaimer +=
      '安全情報については、外務省海外安全ホームページで最新情報をご確認ください。';
  }

  if (hasVisaInfo) {
    disclaimer +=
      'ビザ・入国条件は変更される場合があります。渡航前に大使館・領事館にご確認ください。';
  }

  disclaimer +=
    '渡航に関する最終的な判断は、必ず公式情報に基づいてご自身の責任で行ってください。';

  return disclaimer;
}

// ============================================
// ユーティリティ
// ============================================

/**
 * スリープ関数
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
