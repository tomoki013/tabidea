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
