# Database and Migrations

更新日: 2026-03-29

## 1. Overview

TabideaはSupabase(PostgreSQL)を主要データストアとして使用します。  
DB変更は `supabase/migrations/*.sql` で管理し、空DBからの bootstrap も migration 順序適用で完結する前提です。

## 2. Apply Migrations

推奨:

```bash
supabase db push
```

前提:
- `20250101000000_baseline_core_schema.sql` がベーススキーマを作成します
- 以降の migration はこの baseline の上に追記適用されます
- `supabase/schema.sql` は参照用スナップショットであり、fresh DB の一次セットアップ手順ではありません

既存DBをCLI管理へ移行する場合:
- `supabase_migrations.schema_migrations` が無い既存DBに対して、いきなり `supabase db push` は実行しません
- 先に実DBの不足テーブル・カラムを補い、`supabase migration repair --status applied ...` で履歴を揃えます
- 2026-03-11 時点で duplicate version を避けるため、以下の migration は date-only 形式から一意な timestamp へ正規化済みです
  - `20250224_add_analytics_tables.sql` -> `20250224090000_add_analytics_tables.sql`
  - `20250224_add_reflections_table.sql` -> `20250224100000_add_reflections_table.sql`
  - `20260206_generation_metrics.sql` -> `20260206090000_generation_metrics.sql`
  - `20260206_plan_feedback.sql` -> `20260206100000_plan_feedback.sql`

手動適用時の注意:
- SQL本文のみを実行する
- Git diffテキストを貼り付けない

## 3. Current Migration Inventory

| File | Primary Purpose |
| --- | --- |
| `20250101000000_baseline_core_schema.sql` | ベーススキーマ bootstrap（users, plans, billing, entitlements など） |
| `20250224090000_add_analytics_tables.sql` | 生成・再計画の分析ログテーブル追加 |
| `20250224100000_add_reflections_table.sql` | 旅行後フィードバック（reflection）追加 |
| `20260126_add_chat_and_admin.sql` | チャット履歴テーブル追加 |
| `20260129064236_usage_limits.sql` | 利用制限システム（usage logs, IP hash等） |
| `20260131_stripe_webhook_improvements.sql` | Stripe顧客IDと冪等性改善 |
| `20260205_places_cache.sql` | Places APIキャッシュテーブル |
| `20260206090000_generation_metrics.sql` | 生成品質/速度メトリクス |
| `20260206100000_plan_feedback.sql` | プラン評価フィードバック |
| `20260216110000_plan_normalization_phase0_3.sql` | 正規化旅程、予算、Journal、Shiori基盤 |
| `20260217090000_phase4_phase5_external_and_blog.sql` | 外部検索（ホテル/航空券）とBlog基盤 |
| `20260217103000_sync_public_plans_to_publications.sql` | 公開状態同期トリガー |
| `20260217230000_shiori_journal_and_likes_upgrade.sql` | Journal拡張とLike機能 |
| `20260303000000_remove_premium_yearly.sql` | 旧プランコード正規化 |
| `20260304090000_enforce_unique_stripe_customer_id.sql` | Stripe Customer ID の一意制約 |
| `20260309000000_compose_pipeline_metadata.sql` | Compose pipeline 実行メタデータ |
| `20260310000000_compose_pipeline_v3.sql` | Compose v3 実行ログ・ルートキャッシュ |
| `20260326000000_plan_generation_sessions.sql` | v4 session / pass run / checkpoint 永続化 |
| `20260328000000_add_pipeline_context_to_sessions.sql` | v4 session の pipeline context 追加 |
| `20260329090000_trip_versions_phase1.sql` | itinerary-centric persistence Phase 1 (`trips`, `trip_versions`) |
| `20260329110000_agent_runtime_phase2.sql` | agent runtime Phase 2 (`run_events`, `user_preferences`, `eval_results`, `tool_audit_logs`) |
| `20260329140000_runs_cutover_phase3.sql` | 新パイプライン cutover (`runs`, `run_pass_runs`, `run_checkpoints`) + legacy session 系の backfill |

## 4. Operational Safety Rules

1. Migrationは追記で管理し、baseline 以降の差分は原則追記で管理する
2. 本番適用前にステージングで検証
3. RLS前提テーブルはポリシー確認を必須化
4. 仕様変更時は docs 同時更新
5. fresh DB での `supabase db push` 成功を壊す変更は避け、必要なら idempotent に補正する

## 5. Current Persistence Direction

- 既存の `plans` はユーザー向け保存・共有導線として維持する
- `trips` / `trip_versions` は itinerary JSON を append-only で保持する正系履歴
- `runs` / `run_pass_runs` / `run_checkpoints` は新パイプラインの正系実行ストア
- `generation_sessions` / `generation_pass_runs` / `generation_checkpoints` は cutover 時に backfill された旧ストアであり、新規実行には使わない
- 成功 run のみ `trip_version` を発行する。failed run では itinerary 履歴を残さない
- `trip_versions.itinerary_json` には `completionLevel`, `generationStatus`, `memoryApplied`, `generatedConstraints`, `verificationSummary`, block-level `verificationStatus`, `needsConfirmation`, `sourceOfTruth` などの運用メタデータを含める
- `run_events` は `runs` を親とする append-only イベントストアで、固定 SSE event 名 (`run.started`, `run.progress`, `assistant.delta`, `plan.draft.created`, `plan.block.verified`, `plan.block.flagged`, `itinerary.updated`, `run.finished`, `run.failed`) を保存する
- `user_preferences` は memory の versioned envelope 保存先で、`enabled=false` を既定とし、`schema_version` と `capabilities_json` を持つ
- `eval_results` は run / trip_version の品質評価を 1 metric = 1 row で保持する。finalize / patch / replan の保存直後に rule-based evaluator を自動記録する
- `tool_audit_logs` は verification / provenance 用の監査ログとして利用する
- `run_events`, `eval_results`, `tool_audit_logs` の user-read policy は `runs` を親とする RLS に切り替わっている
## 6. Rollback Strategy

- 破壊的変更は原則避ける
- rollbackが必要な場合は補正migrationを追加
- データ移行は再実行安全（idempotent）を意識する

## 7. Related Files

- `supabase/schema.sql`
- `supabase/migrations/20250101000000_baseline_core_schema.sql`
- `supabase/migrations/20260329090000_trip_versions_phase1.sql`
- `supabase/migrations/20260329110000_agent_runtime_phase2.sql`
- `supabase/migrations/20260329140000_runs_cutover_phase3.sql`
- `supabase/README.md`
- `src/lib/supabase/*`
- `src/lib/services/plan-generation/run-store.ts`
- `src/lib/trips/*`
- `src/lib/memory/*`
- `src/lib/evals/*`
- `src/lib/limits/*`
- `src/app/api/webhooks/stripe/route.ts`
