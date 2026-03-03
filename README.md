# Tabidea

AIと一緒に、旅行先の検討から旅程作成、再調整、共有までを一気通貫で行う旅行プランニングアプリです。  
Next.js 16 + TypeScript + Supabase を中心に構成されています。

## 主な機能

- AI旅行プラン生成（アウトライン生成 -> 日別詳細生成）
- チャットベースの再調整（Replan）
- 渡航情報の集約表示（安全・気候・基本情報など）
- しおり公開（private / unlisted / public）
- Blog連携、外部候補（ホテル・航空券）反映

## Tech Stack

- Frontend/Backend: Next.js 16 (App Router), React 19, TypeScript (strict)
- Styling: Tailwind CSS v4
- Data/Auth/Storage: Supabase
- AI: Gemini / OpenAI, LangChain
- Retrieval: Pinecone
- Billing: Stripe
- Testing: Vitest, Playwright

## Quick Start

### 1. Prerequisites

- Node.js `20.11.0+`（`.node-version`）
- `pnpm`
- Supabaseプロジェクト
- AI APIキー（`GOOGLE_GENERATIVE_AI_API_KEY` または `OPENAI_API_KEY`）

### 2. Install

```bash
pnpm install
```

### 3. Environment Variables

`.env.local` に最低限以下を設定してください。

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `GOOGLE_GENERATIVE_AI_API_KEY` or `OPENAI_API_KEY`

環境変数の全一覧は `docs/development/env-vars.md` を参照してください。

### 4. Run

```bash
pnpm dev
```

Open: `http://localhost:3000`

## Development Commands

```bash
pnpm dev                    # 開発サーバー
pnpm build                  # 本番ビルド
pnpm start                  # ビルド済みアプリ起動
pnpm lint                   # ESLint
pnpm test                   # Vitest（ユニット/コンポーネント）
pnpm exec playwright test   # Playwright E2E
pnpm docs:catalog           # docs/reference/file-catalog.md再生成
```

## Project Structure

```text
src/
  app/                # ページ・API Route・Server Action
  components/
    ui/               # 汎用UI（ビジネスロジックなし）
    common/           # アプリ横断コンポーネント
    features/         # 機能別UI
  lib/
    services/         # ドメインロジック（AI/RAG/Replan等）
    utils/ hooks/     # 共通処理・カスタムフック
  context/ types/
tests/                # E2E (*.spec.ts)
docs/                 # 公式ドキュメント
supabase/             # schema / migrations
```

## Testing Policy

- Unit testはcolocation: 対象ファイルと同じディレクトリに `*.test.ts` / `*.test.tsx`
- E2Eは `tests/*.spec.ts`
- 新規で `__tests__` ディレクトリは作成しない（既存レガシー除く）

## Database & Migrations

- Migrationは `supabase/migrations/*.sql` で追記管理
- 推奨適用手順:

```bash
supabase db push
```

## Documentation Policy (重要)

`docs/` は一次情報です。  
機能、設計、DB、テスト方針を変更するPRでは、同一PRで関連ドキュメントを更新してください。

特に以下を参照:

- `docs/development/setup-and-operations.md`
- `docs/development/architecture.md`
- `docs/development/testing.md`
- `docs/development/performance.md`
- `docs/reference/routes-actions-and-services.md`

## Operational Notes

- package managerは `pnpm` を使用
- サーバーアクション/AI生成処理は `PerformanceTimer` による計測を必須化
- 外部データ利用時は `docs/development/data-and-compliance.md` の遵守事項（robots、規約、出典表示）を確認
