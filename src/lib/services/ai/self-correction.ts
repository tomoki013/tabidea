/**
 * Self-Correction Service
 * スポット検証で失敗したアクティビティを自動修正するサービス
 */

import type { GeminiService } from './gemini';
import type { Itinerary, DayPlan, Activity, Article } from '@/types';

export interface FailedSpotInfo {
  day: number;
  activityIndex: number;
  activityName: string;
  reason: string;
  suggestion?: string;
}

/**
 * 検証に失敗したスポットをAIに修正させる
 *
 * @param ai GeminiServiceインスタンス
 * @param itinerary 元のイテナリー
 * @param failedSpots 検証失敗したスポットの情報
 * @param context RAGコンテキスト記事（修正の参考にする）
 * @returns 修正されたイテナリー
 */
export async function selfCorrectItinerary(
  ai: GeminiService,
  itinerary: Itinerary,
  failedSpots: FailedSpotInfo[],
  context: Article[]
): Promise<Itinerary> {
  if (failedSpots.length === 0) return itinerary;

  console.log(`[self-correction] Correcting ${failedSpots.length} failed spots...`);

  // Build a correction request as chat history
  const failedDescription = failedSpots
    .map((s) => {
      const parts = [`- Day ${s.day}, アクティビティ${s.activityIndex + 1}: 「${s.activityName}」`];
      parts.push(`  問題: ${s.reason}`);
      if (s.suggestion) {
        parts.push(`  代替候補: ${s.suggestion}`);
      }
      return parts.join('\n');
    })
    .join('\n');

  const correctionHistory = [
    {
      role: 'user',
      text: `以下のスポットが検証に失敗しました（実在しない、または閉店している可能性があります）。
これらのスポットを実在する代替スポットに置き換えてください。
置き換える際は、同じエリア・同じ目的（食事は食事、観光は観光）のスポットを選んでください。

検証失敗スポット:
${failedDescription}

注意:
- 失敗したスポット以外は一切変更しないでください
- 代替候補が提示されている場合はそれを優先的に使用してください
- 置き換えたスポットの説明は具体的に書いてください`,
    },
  ];

  try {
    const corrected = await ai.modifyItinerary(itinerary, correctionHistory);

    // Mark corrected activities with google_places source
    for (const failed of failedSpots) {
      const day = corrected.days.find((d) => d.day === failed.day);
      if (day && day.activities[failed.activityIndex]) {
        const act = day.activities[failed.activityIndex];
        // If the activity name changed, mark as corrected
        if (act.activity !== failed.activityName) {
          act.source = {
            type: 'google_places',
            confidence: 'high',
          };
        }
      }
    }

    console.log(`[self-correction] Correction complete`);
    return corrected;
  } catch (error) {
    console.error('[self-correction] Failed to self-correct:', error);
    // Return original itinerary if correction fails
    return itinerary;
  }
}
