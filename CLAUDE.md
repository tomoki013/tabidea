# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

AI Travel Planner is a Japanese-language travel planning web app powered by Google's Gemini AI. It generates personalized travel itineraries based on user preferences, with RAG (Retrieval-Augmented Generation) support using Pinecone vector database to incorporate content from a travel blog ("ともきちの旅行日記").

## Commands

```bash
pnpm dev          # Start development server
pnpm build        # Production build
pnpm lint         # Run ESLint
pnpm test         # Run Vitest unit tests
```

### Running a single test file
```bash
pnpm vitest src/lib/rag/__tests__/scraper.test.ts
```

## Architecture

### Core Flow
1. **Multi-step wizard** (`src/components/TravelPlanner/`) collects user preferences (destination, dates, companions, themes, budget, pace)
2. **Server Action** (`src/app/actions/travel-planner.ts`) orchestrates plan generation
3. **RAG retrieval** (`src/lib/rag/pinecone-retriever.ts`) fetches relevant blog articles from Pinecone using Google embeddings
4. **AI generation** (`src/lib/ai/gemini.ts`) creates structured JSON itineraries via Gemini API
5. **Result display** with shareable URL encoding (`src/lib/urlUtils.ts`)

### Key Interfaces

- `UserInput` - User preferences from the wizard (destination, dates, themes, etc.)
- `Itinerary` - Generated travel plan with days, activities, and blog references
- `AIService` - Interface for AI providers (currently Gemini)
- `ContentRetriever` - Interface for RAG sources (currently Pinecone)

### Directory Structure
```
src/
├── app/                    # Next.js App Router pages and server actions
│   ├── actions/            # Server actions (travel-planner.ts, contact.ts)
│   └── [routes]/           # Page routes (/, /plan, /faq, /contact, etc.)
├── components/
│   ├── TravelPlanner/      # Multi-step wizard component with step subcomponents
│   └── landing/            # Landing page sections
└── lib/
    ├── ai/                 # AI service (Gemini integration)
    ├── rag/                # RAG components (Pinecone retriever, scrapers)
    └── types.ts            # Shared TypeScript types
```

## Environment Variables

Required for AI and RAG features:
- `GOOGLE_API_KEY` - Google AI API key for Gemini
- `GOOGLE_MODEL_NAME` - Model name (defaults to `gemini-2.5-flash`)
- `PINECONE_API_KEY` - Pinecone API key
- `PINECONE_INDEX` - Pinecone index name

Optional for hero images:
- `UNSPLASH_ACCESS_KEY` - Unsplash API access key for destination hero images (falls back to default image if not set)

## Tech Stack

- **Framework**: Next.js 16 with App Router
- **Language**: TypeScript (strict mode)
- **Styling**: Tailwind CSS v4
- **AI**: Google Generative AI (Gemini), LangChain
- **Vector DB**: Pinecone with Google embeddings
- **Testing**: Vitest with jsdom, React Testing Library
- **Animations**: Framer Motion

## Notes

- All user-facing content is in Japanese
- Path alias `@/*` maps to `./src/*`
- Vitest only includes tests matching `src/**/*.test.{ts,tsx}`
