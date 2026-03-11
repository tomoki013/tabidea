# Supabase Migration 実行ガイド

## 推奨: CLIで自動適用

手動でSQLをコピペすると、GitHubの差分表示（`diff --git ...`）まで貼ってしまい
`syntax error at or near "diff"` が発生することがあります。

以下の方法で、**差分ではなく migration ファイル本体**を適用してください。

```bash
supabase db push
```

補足:
- fresh DB は `supabase/migrations/20250101000000_baseline_core_schema.sql` から順に bootstrap されます
- `supabase/schema.sql` は参照用スナップショットです。通常運用では SQL Editor に丸ごと貼り付ける前提ではありません
- 既存DBで `supabase_migrations.schema_migrations` が無い場合は、`db push` の前に `migration repair --status applied ...` で履歴を合わせます
- Supabase CLI の履歴は version 単位で管理されるため、duplicate version を避けるために以下の migration 名は一意な timestamp へ正規化されています
  - `20250224090000_add_analytics_tables.sql`
  - `20250224100000_add_reflections_table.sql`
  - `20260206090000_generation_metrics.sql`
  - `20260206100000_plan_feedback.sql`

## Supabase SQL Editorで手動適用する場合

1. 対象の migration ファイルを開く
2. エディタへ貼るのは **SQL本文のみ**（`diff --git ...` などは含めない）
3. 実行

## トラブルシューティング

### `ERROR: syntax error at or near "diff"`

原因: Gitの差分テキスト（`diff --git ...`）をSQLとして実行している。

対処:
- GitHub の **Raw** 表示からSQLをコピーする
- もしくは CLI の `supabase db push` を使う（推奨）

### `ERROR: relation "places_cache" does not exist`

原因:
- migration を単体で手動実行しており、前提 migration が未適用
- もしくは baseline から順序適用していない

対処:
- 原則 `supabase db push` で順序適用する
- 手動適用なら `20250101000000_baseline_core_schema.sql` から順に実行する
- `20260310000000_compose_pipeline_v3.sql` は `places_cache` 不在でも再実行可能にしてあるが、Places cache 自体を使うには `20260205_places_cache.sql` の適用が必要

### 既存DBで `db push --dry-run` が「全 migration 未適用」になる

原因:
- DB実体は存在するが、`supabase_migrations.schema_migrations` がまだ作られていない
- これまで SQL Editor 等で手動適用してきたため、CLI の履歴とDB実体がズレている

対処:
1. 欠けている migration を先に手動適用する
2. `supabase migration repair --status applied <versions...>` で既存 version を applied 扱いにする
3. その後に `supabase migration list` と `supabase db push --dry-run` で差分が消えることを確認する
