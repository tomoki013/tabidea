# Architecture

更新日: 2026-03-30

## 1. System Overview

TabideaはNext.js App Routerを中心としたMonolith構成です。主要責務は以下に分かれます。

- `src/app`: ルーティング、ページ、API Route、Server Action
- `src/components`: UI表示
- `src/lib/services`: ドメインロジック（AI/RAG/Replan/Travel Info/Validation等）
- `src/lib`: 共通ライブラリ、制限、キャッシュ、外部連携
- `supabase`: DBスキーマ・マイグレーション

## 2. Runtime Components

### Frontend
- React 19 + Next.js 16
- App Router
- Tailwind CSS v4

### Backend Logic
- Server Actions (`src/app/actions/*`)
- API Routes (`src/app/api/*`)

### External Integrations
- AI: Gemini / OpenAI
- DB/Auth/Storage: Supabase
- Vector retrieval: Pinecone
- Payments: Stripe
- Optional: Google Maps / Amadeus / Redis / Unsplash

## 3. Main Data Flows

### 3.1 Plan Generation (Current Canonical Pipeline)

2026-03-29 時点で、本番の旅程生成は `src/lib/services/plan-generation/*` を唯一の正系パイプラインとして扱う。旧 compose/v3 ルート群と `session` API は `archive/unused` へ退避済みで、本体には deprecated stub だけを残す。

設計原則:
- itinerary JSON が唯一の成果物
- Thinking / Fact / Presentation をパス単位で分離する
- 成功 run のみ `trip_version` を発行する
- v4 では deterministic fallback を禁止し、AI-only recovery と明示 failure に統一する
- 旧 compose pipeline の import を live graph に残さない

```
UserInput
  → [POST /api/agent/runs]
  → createRun() → runs
  → internal process kick
  → [POST /api/agent/runs/:runId/process]
      → normalize
      → draft_generate
      → draft_format
      → rule_score
      → local_repair (if needed)
      → selective_verify
      → timeline_construct
      → core_finalize
      → narrative_polish / eval (best-effort enrichment)
  → persist trip_version / eval_results / run_events
  → [GET /api/agent/runs/:runId/stream] SSE replay / live distribution
  → [GET /api/trips/:tripId]
```

- Public API
  - `POST /api/agent/runs`
  - `POST /api/agent/runs/:runId/process`
  - `POST /api/agent/runs/:runId/resume`
  - `GET /api/agent/runs/:runId/stream`
  - `GET /api/trips/:tripId`
  - `POST /api/trips/:tripId/patch`
  - `POST /api/trips/:tripId/replan`
  - `GET/POST /api/users/me/memory`
  - `POST /api/evals/runs/:runId`
- Deprecated API
  - `/api/itinerary/compose`
  - `/api/itinerary/plan/*`
  - 上記は本体から呼ばれず、deprecated response のみ返す
  - 旧 `/api/plan-generation/session/*` stub は active runtime から除去し、`archive/unused` へ退避済み

内部構成:
- 状態機械
  - `created` → `normalized` → `draft_generated` → `draft_formatted` → `draft_scored` → `verification_partial` → `timeline_ready` → `core_ready` → `narrative_partial` → `completed`
  - retryable failure は persisted session 上では `failed` を使いつつ、SSE では `run.retryable_failed` と `run.paused` で表現する
  - `core_ready` は user-facing completion の正規状態
  - `cancelled` は terminal
- パス契約
  - 全パスは `PassContext -> Promise<PassResult<T>>`
  - `PassResult.outcome` は `completed | partial | needs_retry | failed_terminal`
- 実行責務
  - canonical executor は `src/lib/services/plan-generation/run-processor.ts`
  - `GET /api/agent/runs/:runId/stream` は replay / live 配信専用
  - `POST /api/agent/runs/:runId/process` は processing slice を実行する API 契約
- 永続化
  - `runs`, `run_pass_runs`, `run_checkpoints` が生成実行の正系
  - `run_events` は append-only SSE/監査ログ
  - `trips`, `trip_versions` が itinerary 履歴の正系
- 変換レイヤ
  - `transform/draft-to-timeline.ts`
  - `transform/timeline-to-itinerary.ts`
  - 旧 v3 bridge は本体から除去済み
- Narrative
  - `renderers/narrative-renderer-v4.ts` が v4 専用
  - shared deterministic fallback renderer は live path では使わない

運用上の重要点:
- runtime profile `netlify_free_30s` では stream 内部予算を 18 秒に制御する
- `draft_generate` は split canonical planner として動く
  - seed request は day skeleton (`day`, `mainArea`, `overnightLocation`) だけを返す
  - 通常 runtime の day request は 1 日ぶんの minimal stops (`name`, `role`, `timeSlotHint`, `areaHint?`) だけを返す
  - `netlify_free_30s` かつ slow planner (`gemini-3-flash-preview`) では free-runtime microplanner を使い、`day_outline_request -> day_outline_parse -> day_chunk_request -> day_chunk_parse` で 1 日を chunk ごとに埋める
  - 実行モデルは resumable で、1 request ですべての day を終えられなくても `run.paused` で継続する
- `draft_format` が deterministic formatter として `PlannerDraft` を内部 `DraftPlan` へ展開する
  - `destination`, `themes`, `orderingPreferences` は normalized input から組み立てる
  - plan-level `description` / `tripIntentSummary`、day `title` / `summary`、stop の内部メタデータ (`stayDurationMinutes`, `aiConfidence`, `categoryHint` など) はここで補完する
- `draft_generate` の planner contract は軽量化している
  - AI が返す day stop fields は `name`, `role`, `timeSlotHint`, `areaHint?` のみ
  - `searchQuery` は `name` から deterministic に補完し、`areaHint` が無い場合は対象日の `mainArea` を補完する
  - day ごとに `mainArea`, `overnightLocation`, `stops[]` を返す
  - free-runtime microplanner では先に slot outline (`slotIndex`, `role`, `timeSlotHint`, `areaHint?`) を返し、続く chunk request で `slotIndex`, `name`, `role`, `timeSlotHint`, `areaHint?` を最大 2 件ずつ埋める
  - day summary や plan summary は formatter が deterministic に生成する
- `draft_generate` の transport は canonical planner 専用の軽量 system prompt を使う
  - `buildContextSandwich(... generationType="semanticPlan")` の重い共通 system prompt は使わない
  - citation rule や blog/RAG 向け prose 指示を避け、JSON-only の semantic draft に絞る
  - transport は `streamText()` で planner text を逐次回収し、timeout 時も partial text があれば parser-side salvage へ渡せるようにする
  - seed/day parse は JSON extraction + deterministic salvage を正系とし、seed では schema validation 前に不完全な trailing day object を切り落とす prefix salvage を追加している
  - contract 自体を変える staged downgrade / compact fallback は使わない
- `draft_generate` の runtime target
  - `netlify_free_30s` では split planner の 1 request あたり内部 target を 8 秒前後に保つ
  - seed request は小さい schema で先に day skeleton を確定するが、token ceiling は `durationDays` に応じて動的計算し、seed retry ごとに prompt を `standard -> compact -> ultra_compact` へ圧縮する
  - seed が salvage や長時間 retry で終わった request では、そのまま day 1 を始めず `run.paused(nextSubstage=day_request, nextDayIndex=1)` へ切り、day phase を fresh budget で始める
  - day request は 1 日単位で stop 群だけを生成し、retry ごとに prompt / timeout / token ceiling / temperature を `standard -> compact -> ultra_compact` へ段階的に変える
  - `netlify_free_30s` の day request attempt 1 は minimum 3.5s を確保できない場合は開始せず pause し、痩せた budget での無駄打ちを避ける
  - free runtime の retry 時だけ day stop 数の目安を少し絞り、`relaxed 3-4 / balanced 4 / active 4-5` に寄せて完走率を上げる
  - slow free planner path では 1 stream で outline + 最大 1 chunk まで進め、残り chunk は `run.paused(nextSubstage=day_chunk_request)` で続行する
  - day request は残予算が足りない時点で `run.paused(nextSubstage=day_request)` を返す
  - slow day の救済や retry 成功直後は、同じ stream request で次の日を続けず `run.paused(nextSubstage=day_request, nextDayIndex=...)` へ切り、次 stream で fresh attempt として続行する
  - planner max tokens は stage 別に動的計算し、`netlify_free_30s` では seed 最大 `768`、day 最大 `1024` を上限にする
  - seed parser は `extractFirstJsonObject()` 失敗時に deterministic salvage を先に試し、完全な seed を作れなくても valid prefix が取れれば same-contract retry のため pause する
  - day parser も同様に valid stop prefix を deterministic salvage し、meal を含む stop 群が回収できれば同じ contract のまま day completion まで進める
  - `planner_recovery` のような AI repair substage は live path では使わない
- `POST /api/agent/runs` の usage consume は canonical run を止めない
  - quota backend が明示的に limit exceeded を返したときだけ `429`
  - timeout / RPC error / connection error は `usageStatus=degraded` で fail-open
  - `run_created` checkpoint に `usageStatus`, `usageSource` を残す
- stream は `run.progress` で `pass_started` と `pass_completed` の両方を出し、フロントの loading UI はこの checkpoint に追従して進捗を更新する
- stream route は replay / live 配信専用で、pass 実行は `run-processor.ts` が担当する
- process route は 1 回の processing slice を実行し、残り budget や recovery 要否に応じて `run.paused` / `run.retryable_failed` / `run.core_ready` を emit して閉じる
  - フロントは `last-event-id` 付きで `/api/agent/runs/:runId/stream` に再接続し、同じ run の event を継続購読する
  - `draft_generate` は通常 path では `seed_request` → `seed_parse` → `day_request` → `day_parse`、free-runtime microplanner では `seed_request` → `seed_parse` → `day_outline_request` → `day_outline_parse` → `day_chunk_request` → `day_chunk_parse` の substage を持つ
  - `currentDayExecution` が same-run continuation の正本で、current day / strategy / substage / attempt を 1 つの structured state として保持する
  - finalized run (`core_ready` / `completed` + `finalizedTripId/finalizedTripVersion`) に対する `process` は no-op とし、same-run replay/process 再実行で trip version を再作成しない
  - processor は `run.day.started` / `run.day.completed` を emit し、day-atomic progress を event と summary の両方で追えるようにする
  - persisted session state でも retryable failure と terminal failure を分離し、`failed_retryable` は same-run continuation、`failed_terminal` だけが user-facing terminal failure になる
- ただし低予算時でも deterministic fallback には落とさず、AI-only recovery に失敗したら `run.failed` で終了する
- `core_ready` 到達時に canonical `trip_version` を保存し、finalize fence (`finalizedTripId`, `finalizedTripVersion`) を run state に保持する
- `run_events` は監査ログとしては保持するが、live generation の成功条件にはしない
  - SSE は先に enqueue し、`run_events` 永続化は short-timeout best-effort で後追いする
  - replay/list も timeout 時は fail-open で generation を継続する
- pass 実行後の session 永続化は `persistRunSession()` で 1 回の update/select に集約し、`transition + update + reload` の多重往復を避ける
- サーバーログによる開発確認用に、正系生成 run は compact JSONL の checkpoint log を出力する
  - `kind: "run_checkpoint"` を固定 prefix とし、1 run あたり 12-20 行程度に抑える
  - 高頻度の `assistant.delta` 全件や tool request/response 全文は出さず、主要 checkpoint のみを summary で残す
  - 必須 checkpoint は `run_created`, `stream_started`, `pass_started`, `pass_completed`, `pass_failed`, `run_paused`, `narrative_stream_started`, `trip_persist_started`, `trip_persist_completed`, `eval_completed`, `run_finished`, `run_failed`
  - `run_finished` には `tripVersion`, `completionLevel`, `totalDurationMs` を含める
  - `run_failed` には `failureStage`, `errorCode`, `rootCause`, `invalidFieldPath`, `retryable`, `remainingMs` を含める
  - `draft_generate` の pass checkpoint には `plannerContractVersion`, `plannerStrategy`, `selectedTimeoutMs`, `maxTokens`, `promptChars`, `recoveryMode`, `usedTextRecovery`, `nextDayIndex`, `dayChunkIndex`, `seedAttempt`, `dayAttempt`, `outlineAttempt`, `chunkAttempt` を含める
  - `draft_format` の pass checkpoint には `formatterContractVersion`, `dayCount`, `totalStops` を含める
  - Supabase 遅延診断用に `run_event_persist_completed` / `run_event_persist_degraded` も出す
- preflight も JSONL checkpoint を出力する
  - `kind: "preflight_checkpoint"`
  - `preflight_started`, `preflight_completed`, `preflight_degraded`
  - 開発環境では read-only usage check timeout 時に degraded success を返し、本体生成をブロックしない
- 生成進捗は fixed event 名で配信する
  - `run.started`
  - `run.progress`
  - `run.day.started`
  - `run.day.completed`
  - `run.retryable_failed`
  - `run.core_ready`
  - `plan.draft.created`
  - `plan.block.verified`
  - `plan.block.flagged`
  - `assistant.delta`
  - `itinerary.updated`
  - `run.finished`
  - `run.paused`
  - `run.failed`

### 3.2 Trip Editor / Replan / Saved Plan Flow

旅程の編集・再生成は会話ログではなく `trip_version` を更新する。

```
Saved Plan / Local Plan
  → GET /api/trips/:tripId
  → block-centric editor
  → POST /api/trips/:tripId/patch
      → apply JSON Patch
      → activities / timelineItems を再投影
      → new trip_version
  → POST /api/trips/:tripId/replan
      → scope = block | day | style | weather_fallback
      → execute replan_partial run
      → scope 外 block を保持
      → new trip_version
```

- `plans` テーブルはユーザー向け保存・共有 snapshot として維持する
- 生成・評価・履歴の正系は `trips` / `trip_versions` / `runs`
- `updatePlanItinerary()` は `plans` 更新前に `trip_version` 同期を行い、legacy saved plan でも編集を契機に `tripId/version` を獲得する
- 匿名生成では unowned trip を許可し、保存時またはログイン時に所有権を引き継ぐ

### 3.3 Travel Info

1. 目的地とカテゴリを入力
2. カテゴリ権限制御
3. 複数ソース取得（外務省、国情報、天候、為替、AI fallback）
4. 信頼性スコア付与
5. カテゴリMapに統合して返却

### 3.3 Replan

1. 既存旅程と制約を受け取る
2. 制約検出・スロット抽出
3. 候補作成とシグナル評価
4. 説明可能性付きで候補提示

- `ReplanEngine` はスロット特定 → AI代替案生成 → スコアリングを担当し、`applyRecoveryOption()` が itinerary 反映責務を持つ
- `/api/replan` は `src/lib/services/plan-mutation/replan-plan.ts` を通して共通 mutation 契約で返却する
- `useReplan()` は API state hook、`usePlanRegeneration()` はチャット起点の全量再生成 hook として分離する

## 4. App Router Structure

### Route Groups

- `(marketing)` マーケティング・ポリシーページ
- `(planner)` プラン生成・サンプル
- `(info)` 渡航情報

### Other Major Routes

- `/api/*` API endpoints
- `/auth/*` 認証導線
- `/blog/*` ブログ
- `/shiori/*` 公開プラン
- `/admin/metrics` 管理指標

## 5. Domain Layer Mapping

- `lib/services/ai`: モデル選択・生成戦略・プロンプト処理・Travel Expertise Layer（旅行知識ルール）
- `lib/services/plan-mutation`: 生成系の共通 mutation 契約、再生成 orchestration、replan bridge
- `lib/services/plan-generation`: 正系の生成パイプライン (runs 管理、パス実行、状態機械、9 軸スコアリング、timeline/itinerary 変換、v4 narrative renderer)
- `lib/services/rag`: 記事取得・検索
- `lib/services/travel-info`: 渡航情報統合
- `lib/services/replan`: 再計画ロジック
- `lib/services/validation`: スポット検証

## 6. Data and Persistence

### Supabase
- 認証
- プラン保存
- itinerary-centric persistence (`trips`, `trip_versions`) の段階導入
- 公開・いいね・ジャーナル
- 課金関連状態
- 利用制限ログ・分析ログ

補足:
- `plans` はユーザー向け保存・共有の snapshot テーブルとして維持する
- `trips` / `trip_versions` は itinerary JSON の append-only 正系履歴
- `runs` / `run_pass_runs` / `run_checkpoints` は生成実行の正系
- `run_events` は append-only の SSE / 監査ログ
- `tool_audit_logs` は tool provenance の監査
- `user_preferences` は memory の専用保存先で、default off・schema version 必須
- `eval_results` は run / trip_version 単位の品質評価ログ
- `GET /api/trips/:tripId` が canonical itinerary の読取 API
- `POST /api/trips/:tripId/patch` は `day.blocks[]` を canonical source として新 `trip_version` を発行する
- `POST /api/trips/:tripId/replan` は `block | day | style | weather_fallback` scope で部分再生成し、scope 外 block を保持した新 version を作る
- `POST /api/agent/runs` と `GET /api/agent/runs/:runId/stream` が唯一の生成導線
- plan-generation の core planner は day-atomic 実行を前提とし、`draft_generate` live path は `1 invocation = 1 day completion` で `currentDayExecution` を canonical continuation source とする
- deterministic fallback は新パイプラインでは禁止し、失敗 run では `trip_version` を作らない

### Cache
- Outlineキャッシュ
- Travel infoキャッシュ（memory/file/redis戦略）

## 7. Performance and Observability

- `PerformanceTimer`で段階計測
- 主要処理: usage check / cache / rag / prompt / ai generation
- モデルtierに応じて目標時間を切替
- `MetricsCollector`経由で運用指標を記録

## 8. Security and Control Points

- 利用制限: サーバー側で検証
- Stripe webhook署名検証
- Supabase RLS前提のデータアクセス
- robots/スクレイピングポリシー準拠

## 9. Architectural Constraints

- 主要な業務ロジックは`src/lib/services`へ集約
- UIコンポーネントにDBアクセスや外部API呼び出しを直接置かない
- 実装変更時は対応ドキュメントを同時更新

## 10. Related Docs

- `development/coding-rules.md`
- `development/testing.md`
- `development/database-and-migrations.md`
- `reference/routes-actions-and-services.md`
