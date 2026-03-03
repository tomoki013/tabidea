# Database and Migrations

更新日: 2026-03-03

## 1. Overview

TabideaはSupabase(PostgreSQL)を主要データストアとして使用します。  
DB変更は `supabase/migrations/*.sql` で管理し、順序適用が前提です。

## 2. Apply Migrations

推奨:

```bash
supabase db push
```

手動適用時の注意:
- SQL本文のみを実行する
- Git diffテキストを貼り付けない

## 3. Current Migration Inventory

| File | Primary Purpose |
| --- | --- |
| `20250224_add_analytics_tables.sql` | 生成・再計画の分析ログテーブル追加 |
| `20250224_add_reflections_table.sql` | 旅行後フィードバック（reflection）追加 |
| `20260126_add_chat_and_admin.sql` | チャット履歴テーブル追加 |
| `20260129064236_usage_limits.sql` | 利用制限システム（usage logs, IP hash等） |
| `20260131_stripe_webhook_improvements.sql` | Stripe顧客IDと冪等性改善 |
| `20260205_places_cache.sql` | Places APIキャッシュテーブル |
| `20260206_generation_metrics.sql` | 生成品質/速度メトリクス |
| `20260206_plan_feedback.sql` | プラン評価フィードバック |
| `20260216110000_plan_normalization_phase0_3.sql` | 正規化旅程、予算、Journal、Shiori基盤 |
| `20260217090000_phase4_phase5_external_and_blog.sql` | 外部検索（ホテル/航空券）とBlog基盤 |
| `20260217103000_sync_public_plans_to_publications.sql` | 公開状態同期トリガー |
| `20260217230000_shiori_journal_and_likes_upgrade.sql` | Journal拡張とLike機能 |
| `20260303000000_remove_premium_yearly.sql` | 旧プランコード正規化 |

## 4. Operational Safety Rules

1. Migrationは追記で管理し、過去ファイルを改変しない
2. 本番適用前にステージングで検証
3. RLS前提テーブルはポリシー確認を必須化
4. 仕様変更時は docs 同時更新

## 5. Rollback Strategy

- 破壊的変更は原則避ける
- rollbackが必要な場合は補正migrationを追加
- データ移行は再実行安全（idempotent）を意識する

## 6. Related Files

- `supabase/schema.sql`
- `supabase/README.md`
- `src/lib/supabase/*`
- `src/lib/limits/*`
- `src/app/api/webhooks/stripe/route.ts`
