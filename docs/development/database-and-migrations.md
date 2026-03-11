# Database and Migrations

更新日: 2026-03-11

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

## 4. Operational Safety Rules

1. Migrationは追記で管理し、baseline 以降の差分は原則追記で管理する
2. 本番適用前にステージングで検証
3. RLS前提テーブルはポリシー確認を必須化
4. 仕様変更時は docs 同時更新
5. fresh DB での `supabase db push` 成功を壊す変更は避け、必要なら idempotent に補正する

## 5. Rollback Strategy

- 破壊的変更は原則避ける
- rollbackが必要な場合は補正migrationを追加
- データ移行は再実行安全（idempotent）を意識する

## 6. Related Files

- `supabase/schema.sql`
- `supabase/migrations/20250101000000_baseline_core_schema.sql`
- `supabase/README.md`
- `src/lib/supabase/*`
- `src/lib/limits/*`
- `src/app/api/webhooks/stripe/route.ts`
