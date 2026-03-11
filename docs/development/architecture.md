# Architecture

更新日: 2026-03-12

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
Legacy の outline+chunk フローは 2026-03-11 に完全削除済み。

```
UserInput → [1] Request Normalizer (TS) → NormalizedRequest
         → [2] Semantic Planner (Gemini) → SemanticPlan { candidates[] (+ semanticId), dayStructure[] }
         → [3] Place Resolver (Places API, top-k=3, flag) → ResolvedPlaceGroup[]
         → [4] Feasibility Scorer (8-axis, TS) → SelectedStop[]
         → [5] Route Optimizer (固定→must→挿入→2-opt) → OptimizedDay[] (+ nodeId/legId)
         → [6] Timeline Builder (TS, meal window) → TimelineDay[] (+ nodeId/semanticId)
         → [7] Narrative Renderer (Gemini) → NarrativeDay[]
         → [Adapter] → Itinerary (後方互換, metadata に nodeId/semanticId)
         → [GenerationRunLogger] → compose_runs / compose_run_steps (DB)
```

- API: `POST /api/itinerary/compose-jobs` で compose job を作成し、`GET /api/itinerary/compose-jobs/[jobId]` を polling して進捗と結果を取得
- 型: `src/types/itinerary-pipeline.ts`
- 実装: `src/lib/services/itinerary/`
- 定数: `src/lib/services/itinerary/constants.ts`
- エラー: `src/lib/services/itinerary/errors.ts`
- 観測ログ: `src/lib/services/itinerary/generation-run-logger.ts` → compose_runs / compose_run_steps
- Job 状態: `compose_runs` に `current_step`, `current_message`, `progress_payload`, `result_payload`, `error_payload` を保持し、匿名ユーザーは `jobId + accessToken` で参照
- UI: `ComposeLoadingAnimation` + `ComposeLoadingTips` (ステップ 1-6)、narrative_render フェーズでは `StreamingResultView` で日ごとカード段階表示
- Hook: `useComposeGeneration` は job 作成後に polling し、`partialDays`, `totalDays` を job progress から復元
- 実行本体は Netlify Background Function `compose-background` に移し、App Router route の 25 秒制限を回避
- モデル解決は phase-aware (`outline` / `chunk`) で行い、compose pipeline は既存の `AI_MODEL_OUTLINE_*` / `AI_MODEL_CHUNK_*` env 契約を使う
- Places 照合は `ENABLE_COMPOSE_PLACE_RESOLVE` で ON/OFF 制御
- Phase 1 はハバーサイン距離推定 (`distance-estimator.ts`)、Phase 2 で Routes API (`routes-client.ts`) に差替予定
- Pipeline version: `v3`
- Narrative Renderer: `streamObject` で日ごとに部分 JSON を返し、job progress の `partialDays` 経由で UI に中間結果を配信
- Netlify の route timeout 回避は Background Function へ寄せ、パイプライン内部では Places / narrative / hero image の縮退ロジックを継続する

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

- `lib/services/ai`: モデル選択・生成戦略・プロンプト処理
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
