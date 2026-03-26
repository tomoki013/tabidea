# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

AI Travel Planner is a Japanese-language travel planning web app powered by Google's Gemini AI. It generates personalized travel itineraries based on user preferences.

See [docs/development/architecture.md](docs/development/architecture.md) for detailed architecture.

## Commands

```bash
pnpm dev          # Start development server
pnpm build        # Production build
pnpm lint         # Run ESLint
pnpm test         # Run Vitest unit tests
```

See [docs/development/testing.md](docs/development/testing.md) for more testing details.

## Coding Guidelines

### Testing

We follow a **colocation** strategy for unit tests.
- Create `*.test.ts` (or `.tsx`) files next to the source file.
- Run tests with `pnpm test`.

See [docs/development/testing.md](docs/development/testing.md) for the full strategy.

### Documentation Maintenance (Required)

Any PR that changes behavior, architecture, database schema, or testing policy must update `/docs` in the same PR.

- Feature/UX behavior changes: update project/development docs.
- API/Action/Service contract changes: update reference docs.
- Schema/migration changes: update database docs.
- File structure changes: regenerate `docs/reference/file-catalog.md` with `pnpm docs:catalog`.
- For every PR/commit that changes behavior or user-facing content, always update `CHANGELOG.md` in the same PR/commit. `CHANGELOG.md` is the single source of truth for update history, and `src/app/[locale]/(marketing)/updates/page.tsx` is a user-facing summary view derived from that history.

If code and docs disagree, treat code as source of truth and fix docs immediately.

### Dark Mode Requirement (Required)

For any UI change (new page/component or style update), dark mode support is mandatory in the same PR/commit.

- Do not ship light-only UI.
- Verify both light and dark themes before merge.

### Multilingual Requirement (Required)

For any UI change (new page/component/content update), multilingual support is mandatory in the same PR/commit.

- Do not ship Japanese-only UI.
- All user-facing UI (pages, modals, toasts, OG/PDF text) must use i18n keys.
- At minimum, support `ja` and `en`.

### AI Generation Quality Rules (Required)

Plan generation must rely on AI (Gemini) for spot/candidate selection. Generic or fabricated fallback content is strictly prohibited.

- **No generic fallback spots**: Never generate placeholder candidates like "パリ 朝の散策", "東京 観光". If AI cannot produce real spot names, the pipeline MUST fail cleanly.
- **Deterministic fallback = extraction only**: `buildDeterministicDayCandidates` may extract concrete place names already present in user input (mustVisitPlaces, freeText, anchorMoments). It MUST NOT invent new place names.
- **Fail over fabricate**: When deterministic candidates are 0 for a day, return `[]` and let the pipeline surface a clean error. Never pad empty days with vague content.
- **AI reliability is the solution**: Improve prompt quality, timeout budgets, retry logic, and recovery mechanisms. Do not work around AI failure by lowering output quality.

## Tech Stack

- **Framework**: Next.js 16 with App Router
- **Language**: TypeScript (strict mode)
- **Styling**: Tailwind CSS v4
- **AI**: Google Generative AI (Gemini), LangChain
- **Vector DB**: Pinecone with Google embeddings
- **Testing**: Vitest, Playwright

## Directory Structure

See [docs/development/coding-rules.md](docs/development/coding-rules.md) for full coding guidelines.

### Quick Reference

- `src/components/ui/` - Reusable UI components (no business logic)
- `src/components/common/` - Shared app components
- `src/components/features/` - Feature-specific components
- `src/lib/services/` - Business logic
- `src/lib/utils/` - Utility functions
- `src/lib/hooks/` - Custom hooks
- `src/types/` - Type definitions (centralized)

### Naming Conventions

| Type | Convention | Example |
|------|------------|---------|
| Component | PascalCase | `CategorySelector.tsx` |
| Utility | kebab-case | `http-client.ts` |
| Hook | camelCase + use | `useItinerary.ts` |
| Test | Original + .test | `Button.test.tsx` |
| Variables | camelCase | `userName` |
| Constants | SCREAMING_SNAKE | `MAX_RETRY_COUNT` |
| Types | PascalCase | `UserInput` |

### Import Order

1. React/Next.js
2. External libraries (alphabetical)
3. Type imports
4. Services/utilities
5. Hooks
6. Components
7. Relative imports

## Performance Tracking (必須)

全てのサーバーアクション・AI生成処理には **パフォーマンス計測が必須** です。

### ルール

1. **`PerformanceTimer` を使用すること** — `src/lib/utils/performance-timer.ts` のファクトリ関数を使う
2. **全ステップを `timer.measure()` で計測すること** — 外部API呼び出し、AI生成、DB操作など
3. **処理完了時に `timer.log()` を呼ぶこと** — 構造化ログが出力される
4. **目標時間を定義・遵守すること** — `OUTLINE_TARGETS`, `CHUNK_TARGETS` を参照

### 使い方

```ts
import { createOutlineTimer, createChunkTimer } from "@/lib/utils/performance-timer";

// アウトライン生成
const timer = createOutlineTimer();
const articles = await timer.measure('rag_search', () => scraper.search(query));
const outline = await timer.measure('ai_generation', () => ai.generateOutline(prompt, ctx));
timer.log();

// チャンク生成
const timer = createChunkTimer(startDay, endDay);
const prompt = await timer.measure('prompt_build', () => buildPrompt());
const days = await timer.measure('ai_generation', () => ai.generateDayDetails(...));
timer.log();
```

### 目標時間 (モデル別)

| ステップ | Flash 目標 (ms) | Pro 目標 (ms) | 備考 |
|----------|----------------|---------------|------|
| usage_check | 500 | 500 | 利用制限チェック |
| cache_check | 300 | 300 | Redisキャッシュ |
| rag_search | 2,000 | 2,000 | Pinecone検索 + ユーザー制約取得 |
| prompt_build | 100 | 100 | プロンプト構築 |
| ai_generation (outline) | 15,000 | 30,000 | Gemini概要生成 |
| ai_generation (chunk) | 20,000 | 35,000 | Geminiチャンク生成 |
| hero_image | 2,000 | 2,000 | Unsplash画像取得 |
| outline total | 20,000 | 35,000 | 概要生成全体 |
| chunk total | 22,000 | 37,000 | チャンク生成全体 |

詳細は [docs/development/performance.md](docs/development/performance.md) を参照。

## Notes

- User-facing content must support at least Japanese and English (`ja`/`en`)
- Path alias `@/*` maps to `./src/*`
