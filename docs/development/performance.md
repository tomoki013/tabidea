# Performance Guide

更新日: 2026-03-30

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

### 3b. Canonical Plan Generation Targets

| Step | Flash target (ms) | Pro target (ms) | Notes |
| --- | ---: | ---: | --- |
| normalize | 1000 | 1000 | Pure TS |
| draft_generate | 8000 | 12000 | Split canonical planner (`seed_request` + resumable `day_request`) |
| draft_format | 1000 | 1000 | Deterministic `PlannerDraft -> DraftPlan` formatter |
| rule_score | 300 | 300 | Pure TS rubric |
| local_repair | 12000 | 20000 | AI-only retry on quality failure |
| selective_verify | 10000 | 10000 | Places / weather / travel-time checks |
| timeline_construct | 1000 | 1000 | Pure TS timeline assembly |
| narrative_polish | 12000 | 20000 | v4 narrative renderer |
| hero_image | 2000 | 2000 | Unsplash |
| total | 30000 | 50000 | Runtime profile で実効予算を制限 |

Use `createV4PipelineTimer(passId)` for pass execution and `PerformanceTimer` for surrounding routes/actions.

- App Router の正系生成導線は `/api/agent/runs` と `/api/agent/runs/:runId/stream`。
- 各 pass の duration は executor が `createV4PipelineTimer()` で計測し、`run.progress` / server log / eval で追跡する。

### 3c. Runtime Budget Architecture

`netlify_free_30s` などの runtime profile に応じて内部 budget を制御する。

1. **Route-safe reserve**: stream route は finalize / write / close 分の reserve を確保し、残り時間が少ないまま新しい重い pass を始めない。
2. **Pass-local timeout**: `draft_generate`, `local_repair`, `narrative_polish` などの AI pass は route budget 全体を使い切らない。
3. **Split canonical planner**: `draft_generate` は seed skeleton と per-day fill に分け、同一 request に全日程を押し込まない。
4. **UI-visible pass progress**: stream route は `run.progress` に `phase=pass_started` も含め、loading UI が 0% で固まらないようにする。
5. **AI-only recovery**: deterministic fallback は禁止し、explicit failure に統一する。
6. **Lean draft transport**: `draft_generate` は重い semanticPlan 共通 system prompt を使わず、canonical planner 専用の軽量 system prompt を使う。
7. **Text-first JSON transport**: `draft_generate` は `streamText()` で partial text を回収しながら seed/day JSON を生成し、timeout 時も partial output があれば parser-side salvage を先に試す。AI repair fallback は使わない。
8. **Dynamic planner token ceiling**: `draft_generate` の planner call は stage ごとに token ceiling を動的計算する。
   - `netlify_free_30s`: seed 最大 `768`, day 最大 `1024`
   - default: seed 最大 `1024`, day 最大 `1536`
9. **Deterministic formatter after planner**: AI は minimal semantic draft だけを返し、`draft_format` が `DraftPlan` 用の内部メタデータを deterministic に補完する。
10. **Explicit terminal semantics**: failed run では `trip_version` を作らず、成功 run のみ保存する。
11. **Fail-open run creation**: `/api/agent/runs` の usage backend timeout は canonical run 作成を止めず、`usageStatus=degraded` をログに残して継続する。
12. **Parser-first salvage before retry**: incomplete JSON は deterministic salvage を先に試し、それでも contract を満たせなければ same-contract retry のため `run.paused` で継続する。

| パラメータ | 値 | 定義ファイル |
| --- | --- | --- |
| `STREAM_EXECUTION_BUDGET_MS` | 18,000ms (`netlify_free_30s`) | `src/lib/services/plan-generation/constants.ts` |
| `DRAFT_GENERATE_STREAM_CAP_MS` | 8,000ms (`netlify_free_30s` effective cap in pass) | `src/lib/services/plan-generation/passes/draft-generate.ts` |
| `FINALIZE_RESERVE_MS` | 3,000ms | `src/lib/services/plan-generation/constants.ts` |
| `STREAM_CLOSE_RESERVE_MS` | 1,000ms | `src/lib/services/plan-generation/constants.ts` |

補足:
- `draft_generate` は planner contract version を固定し、`seed_request` / `day_request` の両方を観測する
- planner の checkpoint には `plannerContractVersion`, `selectedTimeoutMs`, `maxTokens`, `promptChars`, `recoveryMode`, `usedTextRecovery` を出す
- seed request は `netlify_free_30s` で最大 `4000ms`、day request は最大 `4000ms` を目安にし、request を跨いで day fill を継続する
- planner-specific model は run 作成時に固定し、run 中の provider fallback は行わない
- `draft_format` は deterministic pass として `formatterContractVersion`, `dayCount`, `totalStops` を出す
- `run_created` には `usageStatus` / `usageSource` を含め、billing backend 劣化で route が遅延していないかをサーバーログだけで判定できるようにする
- `strategyAttempt` や `fallbackFromStrategy` のような downgrade metadata は live path では出さない

## 4. Instrumentation Pattern

```ts
const timer = createV4PipelineTimer("draft_generate");
const result = await timer.measure("draft_generate", () => service.generate());
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
