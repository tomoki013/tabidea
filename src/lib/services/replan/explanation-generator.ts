/**
 * explanation-generator.ts — 体験志向の説明文生成
 *
 * NG: 「4.5つ星の人気カフェ」（機能列挙）
 * OK: 「雨宿りしながらゆっくりとカフェで過ごす時間」（体験志向）
 *
 * AI 呼び出し前のフォールバックテンプレートとして機能。
 * AI がタイムアウトした場合もこのテンプレートで補完する。
 */

import type { RecoveryCategory, ReplanTriggerType } from "@/types/replan";
import { createReplanTranslator } from "./i18n";

// ============================================================================
// Public API
// ============================================================================

/**
 * 体験志向の説明文を生成する（テンプレートベース）。
 *
 * @param triggerType - リプランのトリガー種別
 * @param category - リカバリーオプションのカテゴリ
 * @param customExplanation - AI 生成の説明文（あれば優先使用）
 * @returns 説明テキスト
 */
export function generateExplanation(
  triggerType: ReplanTriggerType,
  category: RecoveryCategory,
  customExplanation?: string,
  locale?: string
): string {
  const t = createReplanTranslator(locale);

  // AI 生成のカスタム説明があればそれを使用
  if (customExplanation && customExplanation.length > 10) {
    return customExplanation;
  }

  // テンプレートから取得
  return (
    t(`explanations.${triggerType}.${category}`) ||
    t("explanations.fallback")
  );
}
