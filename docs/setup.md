# Development Setup

This project uses `pnpm` for package management.

## Prerequisites

*   Node.js v20+
*   pnpm

## Installation

```bash
pnpm install
```

## Environment Variables

Create a `.env.local` file in the root directory:

```env
GOOGLE_GENERATIVE_AI_API_KEY=your_google_api_key
UNSPLASH_ACCESS_KEY=your_unsplash_access_key
# PINECONE_API_KEY=your_pinecone_api_key (Required for RAG)
# PINECONE_INDEX=your_pinecone_index (Required for RAG)
# GOOGLE_MODEL_NAME=gemini-2.5-flash (Optional, default: gemini-2.5-flash)
```

## Running Development Server

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser.
