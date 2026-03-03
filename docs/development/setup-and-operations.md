# Setup and Operations

更新日: 2026-03-03

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
