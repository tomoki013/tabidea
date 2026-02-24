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

// ============================================================================
// テンプレートマップ
// ============================================================================

const TEMPLATES: Record<
  ReplanTriggerType,
  Record<RecoveryCategory, string>
> = {
  rain: {
    indoor: "雨の日にぴったりの屋内スポットでゆったり過ごせます",
    food: "雨宿りがてら、地元の味を楽しむひとときはいかがですか",
    culture: "天気を気にせず、文化に触れるひとときを過ごせます",
    rest: "雨音を聞きながら、ゆっくり休憩できる場所があります",
    outdoor: "少し雨が和らいだら楽しめるスポットです",
  },
  fatigue: {
    rest: "歩き疲れた体をゆっくり休められる場所があります",
    food: "美味しいものを食べてエネルギーチャージしませんか",
    indoor: "座ってゆっくりできる屋内スポットで一息つけます",
    culture: "のんびりと見て回れる場所で、疲れを忘れるひとときを",
    outdoor: "ベンチのある公園で、景色を眺めながらひと休みできます",
  },
  delay: {
    food: "待ち時間を活用して、近くのグルメを楽しめます",
    indoor: "時間調整にちょうどいい、近くのスポットがあります",
    culture: "せっかくの時間を、近くの見どころで有効活用できます",
    rest: "次の予定まで、落ち着いて過ごせる場所があります",
    outdoor: "少し散歩しながら、周辺を探索してみませんか",
  },
};

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
  customExplanation?: string
): string {
  // AI 生成のカスタム説明があればそれを使用
  if (customExplanation && customExplanation.length > 10) {
    return customExplanation;
  }

  // テンプレートから取得
  return TEMPLATES[triggerType]?.[category] ?? "新しいプランをご提案します";
}
