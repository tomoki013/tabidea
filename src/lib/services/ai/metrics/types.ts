/**
 * AI生成品質のKPI型定義
 */

export interface StepTimingRecord {
  /** ステップ名 */
  name: string;
  /** 所要時間 (ms) */
  duration: number;
}

export interface GenerationMetrics {
  /** 生成ID（ユニーク） */
  generationId: string;
  /** タイムスタンプ */
  timestamp: Date;

  // パフォーマンス指標
  /** アウトライン生成時間 (ms) */
  outlineGenerationTime?: number;
  /** 詳細生成時間 (ms) */
  detailGenerationTime?: number;
  /** 合計生成時間 (ms) */
  totalGenerationTime?: number;
  /** 個別ステップの所要時間 */
  stepTimings?: StepTimingRecord[];

  // 品質指標
  /** 検証通過率（0-1） */
  validationPassRate?: number;
  /** Self-Correction実行回数 */
  selfCorrectionCount?: number;
  /** source付きアクティビティの割合（0-1） */
  citationRate?: number;
  /** 実際に参照されたRAG記事数 */
  ragArticlesUsed?: number;

  // ユーザー指標（非同期で後から更新）
  /** ユーザー評価 1-5 */
  userRating?: number;
  /** 報告された問題数 */
  accuracyIssueCount?: number;

  // Compose Pipeline v2 メトリクス
  /** パイプラインバージョン */
  pipelineVersion?: string;
  /** 候補数 */
  candidateCount?: number;
  /** 照合成功数 */
  resolvedCount?: number;
  /** フィルタ後数 */
  filteredCount?: number;
  /** Places 照合が有効だったか */
  placeResolveEnabled?: boolean;

  // メタデータ
  /** 使用モデル名 */
  modelName: string;
  /** 目的地 */
  destination: string;
  /** 旅行日数 */
  durationDays: number;
  /** プロンプトバージョン */
  promptVersion: string;
}
