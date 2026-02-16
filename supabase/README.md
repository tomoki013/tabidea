# Supabase Migration 実行ガイド

## 推奨: CLIで自動適用

手動でSQLをコピペすると、GitHubの差分表示（`diff --git ...`）まで貼ってしまい
`syntax error at or near "diff"` が発生することがあります。

以下の方法で、**差分ではなく migration ファイル本体**を適用してください。

```bash
supabase db push
```

## Supabase SQL Editorで手動適用する場合

1. `supabase/migrations/20260216110000_plan_normalization_phase0_3.sql` を開く
2. エディタへ貼るのは **SQL本文のみ**（`diff --git ...` などは含めない）
3. 実行

## トラブルシューティング

### `ERROR: syntax error at or near "diff"`

原因: Gitの差分テキスト（`diff --git ...`）をSQLとして実行している。

対処:
- GitHub の **Raw** 表示からSQLをコピーする
- もしくは CLI の `supabase db push` を使う（推奨）
