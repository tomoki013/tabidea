# Architecture

## Core Flow
1. **Multi-step wizard** (`src/components/TravelPlanner/`) collects user preferences (destination, dates, companions, themes, budget, pace)
2. **Server Action** (`src/app/actions/travel-planner.ts`) orchestrates plan generation
3. **RAG retrieval** (`src/lib/rag/pinecone-retriever.ts`) fetches relevant blog articles from Pinecone using Google embeddings
4. **AI generation** (`src/lib/ai/gemini.ts`) creates structured JSON itineraries via Gemini API
5. **Result display** with shareable URL encoding (`src/lib/urlUtils.ts`)

## Key Interfaces

- `UserInput` - User preferences from the wizard (destination, dates, themes, etc.)
- `Itinerary` - Generated travel plan with days, activities, and blog references
- `AIService` - Interface for AI providers (currently Gemini)
- `ContentRetriever` - Interface for RAG sources (currently Pinecone)

## Directory Structure
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
