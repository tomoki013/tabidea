/**
 * Golden Plan（理想的なプラン例）の型定義
 * Few-Shot例としてプロンプトに注入し、生成品質を向上させる
 */

export interface GoldenPlanExample {
  /** ユニークID */
  id: string;
  /** 目的地 */
  destination: string;
  /** 旅行日数（例: "2泊3日"） */
  duration: string;
  /** 同行者 */
  companions: string;
  /** テーマ */
  themes: string[];
  /** 理想的な1日分のアクティビティ構造（Few-Shot例） */
  sampleDay: {
    day: number;
    title: string;
    activities: {
      time: string;
      activity: string;
      description: string;
      type: 'meal' | 'sightseeing' | 'transport' | 'hotel' | 'activity';
    }[];
  };
}
