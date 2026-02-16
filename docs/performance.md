# Performance Tracking Guide

本プロジェクトでは、全てのサーバーアクション・AI生成処理にパフォーマンス計測を義務付けています。

## 概要

`PerformanceTimer` ユーティリティ (`src/lib/utils/performance-timer.ts`) を使用し、処理の各ステップの実行時間を計測・記録します。

## アーキテクチャ

```
┌─────────────────────────────────────────────────────┐
│ Server Action (travel-planner.ts)                   │
│  ├─ PerformanceTimer (各ステップ計測)                │
│  ├─ MetricsCollector (Supabase保存)                  │
│  └─ console.log (構造化ログ出力)                     │
├─────────────────────────────────────────────────────┤
│ AI Service (gemini.ts)                              │
│  └─ 内部のretry/timeout計測                         │
├─────────────────────────────────────────────────────┤
│ Client Hook (usePlanGeneration.ts)                  │
│  └─ チャンク並列実行の全体管理                       │
└─────────────────────────────────────────────────────┘
```

## 目標時間

### プラン概要生成 (`generatePlanOutline`)

| ステップ | 目標 (ms) | 説明 |
|----------|-----------|------|
| `usage_check` | 500 | 利用制限チェック (Supabase) |
| `cache_check` | 300 | Redis キャッシュ確認 |
| `rag_search` | 2,000 | Pinecone ベクトル検索 + ユーザー制約取得 (並列) |
| `prompt_build` | 100 | プロンプト文字列構築 |
| `ai_generation` | 15,000 | Gemini API 概要生成 |
| `hero_image` | 2,000 | Unsplash 画像取得 |
| `cache_save` | 500 | Redis キャッシュ保存 (非同期) |
| **total** | **20,000** | **全体** |

### プラン詳細チャンク生成 (`generatePlanChunk`)

| ステップ | 目標 (ms) | 説明 |
|----------|-----------|------|
| `prompt_build` | 100 | プロンプト構築 + ユーザー制約取得 |
| `ai_generation` | 20,000 | Gemini API 詳細生成 |
| **total** | **22,000** | **全体** |

### End-to-End 目標 (3日間プラン)

| フェーズ | 目標 (ms) | 説明 |
|----------|-----------|------|
| 概要生成 | 20,000 | アウトライン + 画像 |
| チャンク生成 (並列) | 22,000 | 2チャンク並列 (1st sequential + 2nd parallel) |
| **合計** | **~42,000** | **概要 → 詳細完了** |

## 使い方

### 1. ファクトリ関数を使用

```ts
import {
  createOutlineTimer,
  createChunkTimer,
  createPerformanceTimer,
} from "@/lib/utils/performance-timer";

// プラン概要用（目標時間プリセット済み）
const timer = createOutlineTimer();

// チャンク用（目標時間プリセット済み）
const timer = createChunkTimer(1, 2);

// カスタム用
const timer = createPerformanceTimer("myOperation", {
  step1: 1000,
  step2: 2000,
  total: 5000,
});
```

### 2. ステップを計測

```ts
// 方法A: measure() で自動計測（推奨）
const result = await timer.measure("rag_search", async () => {
  return await scraper.search(query, { topK: 1 });
});

// 方法B: start/end で手動計測
timer.start("cache_save");
await saveToCache(data);
timer.end("cache_save");
```

### 3. ログ出力

```ts
timer.log();
// 出力例:
// [perf] ━━━ generatePlanOutline ━━━
// [perf] Total: 18234ms
// [perf]   ✓ usage_check: 312ms (target: 500ms)
// [perf]   ✓ cache_check: 89ms (target: 300ms)
// [perf]   ✓ rag_search: 1456ms (target: 2000ms)
// [perf]   ✓ prompt_build: 12ms (target: 100ms)
// [perf]   ✓ ai_generation: 14230ms (target: 15000ms)
// [perf]   ✓ hero_image: 1890ms (target: 2000ms)
// [perf] ✓ All targets met
// [perf] ━━━━━━━━━━━━━━━━━━━━━━━━
```

### 4. レポート取得

```ts
const report = timer.getReport();
// {
//   operation: "generatePlanOutline",
//   totalDuration: 18234,
//   steps: [...],
//   targets: [...],
//   timestamp: "2026-02-16T..."
// }
```

## 速度改善のポイント

### 実施済みの最適化

1. **RAG検索とユーザー制約取得の並列化**
   - `scraper.search()` と `getUserConstraintPrompt()` を `Promise.all()` で並列実行
   - 削減効果: ~500-1000ms

2. **チャンクの並列生成**
   - 1番目のチャンクを順次実行（目的地コンテキスト維持のため）
   - 2番目以降のチャンクを `Promise.all()` で並列実行

3. **キャッシュ保存の非同期化**
   - `setOutlineCache()` を非同期で実行し、レスポンスをブロックしない

### 今後の改善候補

- AI生成のストリーミング応答への切り替え
- プロンプトの圧縮（トークン数削減）
- キャッシュヒット率の向上（パラメータ正規化の改善）

## 新しいサーバーアクション追加時のチェックリスト

新しいサーバーアクションやAI生成処理を追加する際は、必ず以下を行ってください:

- [ ] `PerformanceTimer` を作成（ファクトリ関数 or `createPerformanceTimer`）
- [ ] 全ての外部API呼び出しを `timer.measure()` で計測
- [ ] 目標時間を `PerformanceTargets` として定義
- [ ] 処理完了時に `timer.log()` を呼び出し
- [ ] `OUTLINE_TARGETS` / `CHUNK_TARGETS` に準じた目標時間を `performance-timer.ts` に追加
- [ ] このドキュメントの「目標時間」セクションを更新

## テスト

`PerformanceTimer` のユニットテストは `src/lib/utils/performance-timer.test.ts` にあります。

```bash
pnpm test -- performance-timer
```
