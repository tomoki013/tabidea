/**
 * ストリーミング生成関連の型定義
 * Streaming Generation Types for AI Travel Planner
 */

import type { PlanOutline, DayPlan } from './itinerary';
import type { UserInput } from './user-input';
import type { Article } from './api';

/**
 * 生成フェーズ
 */
export type GenerationPhase =
  | 'idle'               // 初期状態
  | 'generating_outline' // アウトライン生成中
  | 'outline_ready'      // アウトライン完了、詳細生成開始
  | 'generating_details' // 詳細生成中
  | 'completed'          // 全完了
  | 'error';             // エラー

/**
 * 各Dayの生成状態
 */
export type DayGenerationStatus = 'pending' | 'generating' | 'completed' | 'error';

/**
 * ヒーロー画像情報
 */
export interface HeroImageData {
  url: string;
  photographer: string;
  photographerUrl: string;
}

/**
 * チャンク情報（生成用）
 */
export interface ChunkInfo {
  start: number;
  end: number;
}

/**
 * ストリーミング生成状態
 */
export interface GenerationState {
  /** 現在のフェーズ */
  phase: GenerationPhase;
  /** 生成されたアウトライン */
  outline?: PlanOutline;
  /** ヒーロー画像 */
  heroImage?: HeroImageData | null;
  /** 更新されたユーザー入力（目的地選択後） */
  updatedInput?: UserInput;
  /** RAGコンテキスト */
  context?: Article[];
  /** 各Dayの生成状態 */
  dayStatuses: Map<number, DayGenerationStatus>;
  /** 完了したDayPlan */
  completedDays: DayPlan[];
  /** 合計日数 */
  totalDays: number;
  /** 現在生成中のチャンク */
  currentChunks?: ChunkInfo[];
  /** エラーメッセージ */
  error?: string;
  /** エラーの種類 */
  errorType?: 'outline' | 'chunk' | 'save' | 'limit_exceeded' | 'network';
}

/**
 * 初期生成状態
 */
export const initialGenerationState: GenerationState = {
  phase: 'idle',
  dayStatuses: new Map(),
  completedDays: [],
  totalDays: 0,
};
