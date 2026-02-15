/**
 * Cross-Review戦略
 * 生成モデルとは異なるプロバイダでレビュー・改善を行う
 */

import { generateObject } from 'ai';
import { resolveModelForProvider, type ProviderName } from '../model-provider';
import { ReviewResultSchema, type ReviewResult } from '../schemas/review-schemas';
import type { PlanOutline, DayPlan } from '@/types';

// ============================================
// Types
// ============================================

export interface CrossReviewResult {
  /** レビュー結果 */
  review: ReviewResult;
  /** criticalな指摘があったか */
  hasCriticalIssues: boolean;
  /** 修正指示（modifyItineraryに渡すためのテキスト） */
  correctionInstructions: string | null;
}

// ============================================
// Review Prompts
// ============================================

function buildOutlineReviewPrompt(outline: PlanOutline): string {
  return `あなたは旅行プランのレビュアーです。以下の旅程アウトラインを厳密にレビューしてください。

## 旅程アウトライン
${JSON.stringify(outline, null, 2)}

## レビュー観点

### 地理的整合性 (geographic)
- 各日の overnight_location が翌日の活動エリアと矛盾していないか
- 物理的に不可能な移動（テレポート）がないか
- 移動手段（travel_method_to_next）が現実的か

### タイミング (timing)
- 日程配分が適切か（1日に詰め込みすぎ、逆に少なすぎないか）
- 移動時間を考慮しているか

### 品質 (quality)
- description が魅力的で具体的か
- 旅行者目線で実用的な情報があるか

### 正確性 (accuracy)
- 存在しない場所や閉鎖された施設が含まれていないか
- 季節や地域に不適切な提案がないか

### 多様性 (diversity)
- 同じエリアやジャンルに偏っていないか
- 食事・観光・体験のバランスが取れているか

## 重要
- critical: 旅行が破綻するレベルの問題（テレポート、存在しない場所等）
- major: 体験品質が大きく下がる問題
- minor: あったら良い改善点`;
}

function buildDayDetailsReviewPrompt(days: DayPlan[], destination: string): string {
  return `あなたは旅行プランのレビュアーです。以下の日程詳細を厳密にレビューしてください。

## 目的地: ${destination}
## 日程詳細
${JSON.stringify(days, null, 2)}

## レビュー観点

### 地理的整合性 (geographic)
- 各アクティビティ間の移動が現実的か
- 朝は前日の宿泊地から始まっているか

### タイミング (timing)
- 各アクティビティの所要時間が現実的か
- 営業時間を考慮しているか（朝にお寺、夜にバー等）

### 品質 (quality)
- アクティビティの説明が具体的で魅力的か
- 料理やスポットの名前が正確か

### 正確性 (accuracy)
- 実在するスポットか
- 価格帯が現実的か

### 多様性 (diversity)
- 食事の種類が偏っていないか
- 観光と体験のバランスが取れているか

## 重要
- critical: 旅行が破綻するレベルの問題
- major: 体験品質が大きく下がる問題
- minor: あったら良い改善点`;
}

// ============================================
// Cross-Review Execution
// ============================================

/**
 * Outlineをクロスレビュー
 */
export async function crossReviewOutline(
  outline: PlanOutline,
  reviewerProvider: ProviderName,
): Promise<CrossReviewResult> {
  console.log(`[cross-review] Reviewing outline with ${reviewerProvider}...`);
  const startTime = Date.now();

  try {
    const { model, modelName } = resolveModelForProvider(reviewerProvider, 'itinerary', {
      structuredOutputs: true,
    });
    console.log(`[cross-review] Using model: ${modelName}`);

    const prompt = buildOutlineReviewPrompt(outline);

    const { object: review } = await generateObject({
      model,
      schema: ReviewResultSchema,
      prompt,
      temperature: 0.1, // レビューは保守的に
    });

    const criticalIssues = review.issues.filter(i => i.severity === 'critical');
    const hasCriticalIssues = criticalIssues.length > 0;

    // Build correction instructions from critical issues
    let correctionInstructions: string | null = null;
    if (hasCriticalIssues) {
      correctionInstructions = criticalIssues
        .map(issue => `- [${issue.category}] ${issue.description}\n  修正案: ${issue.suggestion}`)
        .join('\n');
    }

    const elapsed = Date.now() - startTime;
    console.log(`[cross-review] Outline review complete in ${elapsed}ms. Score: ${review.overallScore}, Critical: ${criticalIssues.length}, Major: ${review.issues.filter(i => i.severity === 'major').length}, Minor: ${review.issues.filter(i => i.severity === 'minor').length}`);

    // Log non-critical issues for future reference
    const majorMinor = review.issues.filter(i => i.severity !== 'critical');
    if (majorMinor.length > 0) {
      console.log(`[cross-review] Non-critical issues:`, majorMinor.map(i => `[${i.severity}] ${i.description}`).join('; '));
    }

    return {
      review,
      hasCriticalIssues,
      correctionInstructions,
    };
  } catch (error) {
    console.error(`[cross-review] Outline review failed:`, error);
    // Review failure is non-blocking
    return {
      review: { overallScore: 0, issues: [], strengths: [] },
      hasCriticalIssues: false,
      correctionInstructions: null,
    };
  }
}

/**
 * DayDetailsをクロスレビュー
 */
export async function crossReviewDayDetails(
  days: DayPlan[],
  destination: string,
  reviewerProvider: ProviderName,
): Promise<CrossReviewResult> {
  console.log(`[cross-review] Reviewing day details with ${reviewerProvider}...`);
  const startTime = Date.now();

  try {
    const { model, modelName } = resolveModelForProvider(reviewerProvider, 'itinerary', {
      structuredOutputs: true,
    });
    console.log(`[cross-review] Using model: ${modelName}`);

    const prompt = buildDayDetailsReviewPrompt(days, destination);

    const { object: review } = await generateObject({
      model,
      schema: ReviewResultSchema,
      prompt,
      temperature: 0.1,
    });

    const criticalIssues = review.issues.filter(i => i.severity === 'critical');
    const hasCriticalIssues = criticalIssues.length > 0;

    let correctionInstructions: string | null = null;
    if (hasCriticalIssues) {
      correctionInstructions = criticalIssues
        .map(issue => {
          const dayStr = issue.day ? `Day ${issue.day}: ` : '';
          return `- ${dayStr}[${issue.category}] ${issue.description}\n  修正案: ${issue.suggestion}`;
        })
        .join('\n');
    }

    const elapsed = Date.now() - startTime;
    console.log(`[cross-review] Day details review complete in ${elapsed}ms. Score: ${review.overallScore}, Critical: ${criticalIssues.length}`);

    return {
      review,
      hasCriticalIssues,
      correctionInstructions,
    };
  } catch (error) {
    console.error(`[cross-review] Day details review failed:`, error);
    return {
      review: { overallScore: 0, issues: [], strengths: [] },
      hasCriticalIssues: false,
      correctionInstructions: null,
    };
  }
}
