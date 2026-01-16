# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

AI Travel Planner is a Japanese-language travel planning web app powered by Google's Gemini AI. It generates personalized travel itineraries based on user preferences.

See [docs/architecture.md](docs/architecture.md) for detailed architecture.

## Commands

```bash
pnpm dev          # Start development server
pnpm build        # Production build
pnpm lint         # Run ESLint
pnpm test         # Run Vitest unit tests
```

See [docs/testing.md](docs/testing.md) for more testing details.

## Coding Guidelines

### Testing

We follow a **colocation** strategy for unit tests.
- Create `*.test.ts` (or `.tsx`) files next to the source file.
- Run tests with `pnpm test`.

See [docs/testing.md](docs/testing.md) for the full strategy.

## Tech Stack

- **Framework**: Next.js 16 with App Router
- **Language**: TypeScript (strict mode)
- **Styling**: Tailwind CSS v4
- **AI**: Google Generative AI (Gemini), LangChain
- **Vector DB**: Pinecone with Google embeddings
- **Testing**: Vitest, Playwright

## Notes

- All user-facing content is in Japanese
- Path alias `@/*` maps to `./src/*`
