# Setup and Operations

更新日: 2026-03-30

## 1. Prerequisites

- Node.js 20+
- pnpm
- Supabase project
- AI provider key (Gemini or OpenAI)

## 2. Install

```bash
pnpm install
```

## 3. Start Development Server

```bash
pnpm dev
```

Open: `http://localhost:3000`

## 4. Core Commands

```bash
pnpm dev            # Development server
pnpm build          # Production build + type checking
pnpm start          # Start built app
pnpm lint           # ESLint
pnpm test           # Vitest unit tests
pnpm exec playwright test   # Playwright E2E
pnpm docs:catalog   # Regenerate docs/reference/file-catalog.md
```

## 5. Environment Setup

環境変数一覧は `development/env-vars.md` を参照してください。

最低限必要なもの（ローカル開発）:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `GOOGLE_GENERATIVE_AI_API_KEY` または `OPENAI_API_KEY`

## 6. Database Migration Operation

### 推奨手順

```bash
supabase db push
```

### 補足

- SQL Editorで手動実行する場合は、Git差分ではなくSQL本文のみを実行すること
- 変更後はアプリを再起動して反映確認すること

詳細: `development/database-and-migrations.md`

## 7. Daily Development Checklist

1. ブランチ作成
2. 実装
3. `pnpm lint` / `pnpm test`
4. 必要に応じて `pnpm exec playwright test`
5. 仕様変更がある場合は `/docs` 更新
6. 変更点と検証結果をPRに記載

## 8. Incident/Troubleshooting Quick Notes

- サーバーアクションの403: `next.config.ts` の `allowedDevOrigins` を確認
- APIキー不足エラー: `.env.local` と `process.env` 参照箇所を確認
- Supabase接続異常: URL/ANON/SERVICE_ROLEの整合性を確認
- Stripe Webhook失敗: `STRIPE_WEBHOOK_SECRET` と署名検証を確認

## 9. Operational Rules

- package managerは必ず `pnpm` を使用
- コードと同じPRでドキュメントを更新
- パフォーマンス計測対象の処理には `PerformanceTimer` を導入

## 10. Plan Generation Server Log Checkpoints

開発環境でプラン生成の挙動を確認するときは、SSE や DB を直接見なくても、サーバーログの checkpoint JSONL だけで run 全体を追える。

- 正系ログは `kind: "run_checkpoint"` の 1 行 JSON
- preflight は `kind: "preflight_checkpoint"` の 1 行 JSON
- 成功 run の期待順序
  - `run_created`
  - `stream_started`
  - `pass_started` / `pass_completed` for `normalize`
  - `pass_started` / `pass_completed` for `draft_generate`
  - `pass_started` / `pass_completed` for `draft_format`
  - `pass_started` / `pass_completed` for `rule_score`
  - `pass_started` / `pass_completed` for `selective_verify` または明示 skip
  - `pass_started` / `pass_completed` for `timeline_construct`
  - `narrative_stream_started`
  - `trip_persist_started`
  - `trip_persist_completed`
  - `eval_completed`
  - `run_finished`
- 失敗 run の期待終端
  - `pass_failed` または `run_failed`
  - failed run では `trip_persist_completed` が出ない
- 主要確認項目
  - `run_created.usageStatus` が `confirmed` または `degraded` で出る
  - `POST /api/agent/runs` が usage backend timeout で 30 秒以上止まらない
  - `run_finished.tripVersion` が存在する
  - `trip_persist_completed.tripVersion` と一致する
  - `run_failed.errorCode` は固定 code (`draft_generation_timeout` など) で出る
  - `run_event_persist_degraded` が多発している場合、SSE 本体ではなく Supabase 永続化が遅延源
  - `preflight_degraded` が出ている場合、usage/billing 読み取りが遅いが、開発環境では fail-open で生成は継続する
  - `plannerContractVersion` は現行 `semantic_draft_v4`
  - `draft_generate.maxTokens` は stage ごとに動的に変わり、`netlify_free_30s` では seed 最大 `768` / day 最大 `1024`
  - `draft_generate.selectedTimeoutMs` は free runtime で seed/day ともに最大 `4000` 付近を上限にする
  - `pass_completed(outcome=partial)` と `run_paused(nextSubstage=seed_request|day_request)` が出ていれば、same-contract retry のために run を継続している

PowerShell で checkpoint 行だけ抜き出す例:

```powershell
Get-Content .next\\server.log | Select-String '\"kind\":\"run_checkpoint\"'
```

preflight も含めて見る例:

```powershell
Get-Content .next\\server.log | Select-String '\"kind\":\"(run|preflight)_checkpoint\"'
```

共有するときは、できれば同一 run の以下をまとめて渡す:

- `runId`
- `kind: "run_checkpoint"` を含むサーバーログ行
- 画面に表示されたエラー文言（失敗時のみ）
