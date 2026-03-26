# Architecture

更新日: 2026-03-21

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

### 3.1 Plan Generation (Compose Pipeline v3)

LLM は「意味」を作り、Google Maps は「現実」を返し、アプリケーションコードが「制約を解く」3層分離アーキテクチャ。
さらに seed 段階で AI 自身に destination highlights（その街らしさを担保する代表スポット）を具体名で先に宣言させ、day-by-day のスポット生成ではその highlights を引き継いで落としにくくしている。
加えて seed/day の両プロンプトで、最適化の優先順位を『絶対条件 → ユーザー希望の満足度最大化 → 地域らしさ → 移動の無理の少なさ』に固定し、各日の候補が「希望に強く合う主役スポット + その地域を訪れた納得感が出る代表スポット」の両立になるよう指示している。
また、あまり有名ではない地域でも generic な候補名で埋めず、商店街・市場・展望台・温泉街・資料館など地場の定番になりやすい具体名を選ぶよう明示し、deterministic fallback でも must-visit / free text / anchor moments から具体スポット名を抽出して使う。
`dayStructure` には `startArea` / `endArea` / `flowSummary` / `anchorMoments` を持たせ、単なるスポット列挙ではなく「朝どこから始まり、昼に何を中心体験にし、夕方どこで締めるか」という itinerary の流れを seed から固定している。
Legacy の outline+chunk フローは 2026-03-11 に完全削除済み。

```
UserInput → [Seed API]
         → [1] Usage Check (TS)
         → [2] Request Normalizer (TS) → NormalizedRequest
         → [3] Semantic Seed Planner (Gemini) → { destination, description, dayStructure[] (+ flow anchors) }
         → [Spot APIs × day]
         → [4] Semantic Day Planner (Gemini, day-sized batches) → SemanticCandidate[]
         → [Assemble API]
         → [5] Place Resolver (Places API, top-k=3, flag) → ResolvedPlaceGroup[]
         → [6] Feasibility Scorer (8-axis, TS) → SelectedStop[]
         → [7] Route Optimizer (固定→must→挿入→2-opt) → OptimizedDay[] (+ nodeId/legId)
         → [8] Timeline Builder (TS, meal window) → TimelineDay[] (+ nodeId/semanticId)
         → [Narrate API]
         → [9] Narrative Renderer (Gemini / streamObject) → NarrativeDay[]
         → [Adapter] → Itinerary (後方互換, metadata に nodeId/semanticId)
             → injectFlights (Day 1 往路 / 最終日 復路フライト注入)
             → injectAccommodations (各日末尾に宿泊カード注入, 最終日除く)
             → inferTransitType (距離ベースで walking/bus/train/bullet_train を推定)
         → [GenerationRunLogger] → compose_runs / compose_run_steps (DB)
```

- API: `SSE /api/itinerary/plan/seed` → `POST /api/itinerary/plan/spots`（最大3並列）→ `POST /api/itinerary/plan/assemble` → `SSE /api/itinerary/plan/narrate`
- 型: `src/types/itinerary-pipeline.ts`
- 実装: `src/lib/services/itinerary/`
- 定数: `src/lib/services/itinerary/constants.ts`
- エラー: `src/lib/services/itinerary/errors.ts`
- 観測ログ: `src/lib/services/itinerary/generation-run-logger.ts` → compose_runs / compose_run_steps
- UI: `ComposeLoadingAnimation` + `ComposeLoadingTips` で seed 完了後すぐに目的地と日数を表示し、spot generation は日別進捗として見せる。`narrative_render` フェーズでは `StreamingResultView` で日ごとカード段階表示
- Hook: `useComposeGeneration` は seed (SSE) → parallel spots (`mapWithConcurrency`, 最大3並列) → assemble → narrate をクライアントから実行し、`partialDays`, `totalDays`, `previewDestination` を更新する。seed は SSE ストリーミングで `normalized` イベントにより中間結果を先行受信し、AI生成タイムアウト時もクライアントがデータを保持する。spots は全日を並列発火し、事後に `deduplicateCandidates()` で重複排除する。narrate は2日ずつのチャンク分割で生成し、各チャンクが独自の時間予算 (`NARRATE_CHUNK_BUDGET_MS`) を持つ。split route が空レスポンス・非JSON・途中失敗・終端欠落で壊れた場合は、互換用の legacy SSE `/api/itinerary/compose` へ自動フォールバックして生成を継続する。must-visit は index 順を日数で均等配分する deterministic scheduling を使い、日数より多い必訪問スポットが入力されても取りこぼさない
- Semantic planner の structured output には transport recovery 層を置く。`generateObject()` が `Unterminated string in JSON` などの parse 系エラーを返した場合でも、その場で planner 失敗とはみなさず text JSON repair へ移行する。repair はまず「短い JSON だけを再送」させ、なお壊れていれば seed/day/plan ごとの minimal schema 指示で 2 回目の compact retry を行う。合わせて `orderingPreferences` / `fallbackHints` / `destinationHighlights` / `anchorMoments` / `tags` の件数上限を設け、structured output transport が壊れやすい巨大 payload 自体を設計上出しにくくしている
- モデル解決は phase-aware (`outline` / `chunk`) で行い、compose pipeline は既存の `AI_MODEL_OUTLINE_*` / `AI_MODEL_CHUNK_*` env 契約を使う
- Places 照合は `ENABLE_COMPOSE_PLACE_RESOLVE` で ON/OFF 制御
- Feasibility Scorer は Places Resolver の `matchScore` を name match の下限として扱う。これにより、日本語候補名 ↔ 英語/ローマ字 place 名、または `searchQuery + destination` 形式でも「Places では見つかっているのに scorer 側だけ低得点で全落ち」という層間不整合を防ぐ。さらに、resolved 候補が全部 threshold 未満でも assemble を 500 失敗にせず、warning 付きで最上位候補を救済採用して timeline/narrative まで完走を優先する
- Phase 1 はハバーサイン距離推定 (`distance-estimator.ts`)、Phase 2 で Routes API (`routes-client.ts`) に差替予定
- Pipeline version: `v3`
- Narrative Renderer: `streamObject` で日ごとに部分 JSON を返し、`partialDays` 経由で UI に中間結果を配信
- 主要なタイムアウト耐性は Background Job ではなく3つの設計で確保する: (1) スポット生成の並列化 (`mapWithConcurrency`, `deduplicateCandidates`), (2) Seed ルートの SSE ストリーミング (`readSSEStream`), (3) ナラティブ生成のチャンク分割 (`NARRATE_DAYS_PER_CHUNK=2`, `mergeChunkedNarrativeOutputs`)
- Seed phase は唯一の “全日共通の前提生成” なので、AI seed が platform deadline に近づいた場合でも全体失敗にせず、`buildDeterministicSemanticSeedPlan()` で dayStructure / ordering / must-visit highlights を TS で再構成して day-by-day spots generation を継続する。これにより seed timeout が単発の 500 失敗へ直結しない。ただし deterministic fallback はユーザー入力から抽出した具体スポット名のみ使用し、汎用的なスポット名の fabrication は禁止。抽出候補 0 件の日は空配列を返しパイプラインを失敗させる
- split compose route の `maxDuration` は現在 25 秒だが、seed / spots のアプリ内 deadline はその full budget を使い切らない。実測では 24 秒台まで AI 呼び出しを引っ張ると、プラットフォーム側がログ flush・JSON serialize・response write の前に request を kill し、せっかくの deterministic fallback がクライアントへ届かないことがあった。そのため orchestrator は route cap より約 4 秒早い内部 deadline を使い、fallback 応答を確実に返す tail room を確保している。なお Next.js の segment config 制約上、route 側の `maxDuration` は各 route ファイルで literal のまま持ち、共通化は orchestrator の runtime budget 側で行う

補足（サンプル再生成）:
- `src/scripts/generate-sample-itineraries.ts` は compose pipeline (`runComposePipeline`) を使用してサンプル旅程を生成
- サンプル旅程JSONは `src/data/itineraries/{locale}/{id}.json`（`ja`/`en`）を優先参照

### 3.2 Travel Info

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
- `lib/services/plan-generation`: 生成オーケストレーション
- `lib/services/rag`: 記事取得・検索
- `lib/services/travel-info`: 渡航情報統合
- `lib/services/replan`: 再計画ロジック
- `lib/services/validation`: スポット検証

## 6. Data and Persistence

### Supabase
- 認証
- プラン保存
- 公開・いいね・ジャーナル
- 課金関連状態
- 利用制限ログ・分析ログ

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
