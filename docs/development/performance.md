# Performance Guide

更新日: 2026-03-03

## 1. Scope

サーバーアクションとAI生成処理は、`PerformanceTimer`による計測を必須とします。

対象例:
- Outline generation
- Chunk generation
- 外部API呼び出しを含む重い処理

## 2. Required Rules

1. `createOutlineTimer` / `createChunkTimer` などのファクトリを使う
2. 主要ステップを `timer.measure()` で囲む
3. 終了時に `timer.log()` を呼ぶ
4. 目標時間を定義し、必要に応じて tier別に切り替える

## 3. Representative Targets

| Step | Flash target (ms) | Pro target (ms) |
| --- | ---: | ---: |
| usage_check | 500 | 500 |
| cache_check | 300 | 300 |
| rag_search | 2000 | 2000 |
| prompt_build | 100 | 100 |
| ai_generation (outline) | 15000 | 30000 |
| ai_generation (chunk) | 20000 | 35000 |
| hero_image | 2000 | 2000 |
| outline total | 20000 | 35000 |
| chunk total | 22000 | 37000 |

### 3b. Compose Pipeline Targets

| Step | Flash target (ms) | Pro target (ms) | Notes |
| --- | ---: | ---: | --- |
| usage_check | 500 | 500 | |
| normalize | 50 | 50 | Pure TS |
| semantic_plan | 15000 | 30000 | Seed + day-sized batches of Gemini generateObject |
| place_resolve | 10000 | 10000 | Places API (flag OFF でスキップ) |
| feasibility_score | 200 | 200 | Pure TS (flag OFF でスキップ) |
| route_optimize | 1000 | 1000 | Haversine + greedy + 2-opt |
| timeline_build | 100 | 100 | Pure TS |
| narrative_render | 12000 | 20000 | Gemini generateObject |
| hero_image | 2000 | 2000 | Unsplash |
| total | 45000 | 65000 | Places OFF 時は ~30000 |

Use `createComposeTimer(modelTier?)` factory.

- App Router route は seed / spots / assemble / narrate の各短時間フェーズを担当する。
- `semantic_plan` の target 超過は `PerformanceTimer` で監視しつつ、最も重い AI スポット生成は day-sized batches に分割して route timeout を構造的に避ける。

### 3c. Timeout Prevention Architecture

タイムアウト防止のため、以下の3つの設計変更を適用:

1. **スポット生成の並列化**: フロントエンドが `/plan/spots` を1日ずつ逐次呼び出していた処理を、最大3並列で実行。`mapWithConcurrency()` (`src/lib/utils/concurrency.ts`) を使用。候補の重複は `deduplicateCandidates()` で事後排除。
2. **Seed ルートの SSE ストリーミング**: `/api/itinerary/plan/seed` を JSON POST から SSE に変換。AI生成中に `normalized` イベントで中間結果を先行送信し、タイムアウト時もクライアントがデータを保持。
3. **ナラティブ生成のチャンク分割**: `runNarratePipeline` が全日分を1回の AI 呼び出しで処理していた設計を、2日ずつのチャンクに分割。各チャンクの予算は `NARRATE_CHUNK_BUDGET_MS` (18s)。

| パラメータ | 値 | 定義ファイル |
| --- | --- | --- |
| NARRATE_DAYS_PER_CHUNK | 2 | `runtime-budget.ts` |
| NARRATE_CHUNK_BUDGET_MS | 18,000ms | `runtime-budget.ts` |
| NARRATE_CHUNK_RESERVE_MS | 1,500ms | `runtime-budget.ts` |
| SPOTS_CONCURRENCY | 3 | `useComposeGeneration.ts` |

## 4. Instrumentation Pattern

```ts
const timer = createOutlineTimer();
const result = await timer.measure("ai_generation", () => service.generate());
timer.log();
```

## 5. Optimization Playbook

- I/Oを`Promise.all`で並列化
- キャッシュヒット経路を先に評価
- モデル出力上限（token）を明示
- 長いプロンプトの重複を削除
- 失敗時リトライ設定を現実的な値へ調整

## 6. PR Checklist

- [ ] 計測が追加/維持されている
- [ ] 目標値が妥当
- [ ] ログが運用で読める形式
- [ ] docs更新済み
