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
# AI & External Services
GOOGLE_GENERATIVE_AI_API_KEY=your_google_api_key
UNSPLASH_ACCESS_KEY=your_unsplash_access_key
# PINECONE_API_KEY=your_pinecone_api_key (Required for RAG)
# PINECONE_INDEX=your_pinecone_index (Required for RAG)
# GOOGLE_MODEL_NAME=gemini-2.5-flash (Optional, default: gemini-2.5-flash)

# Supabase (Required for authentication and plan storage)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
```

### Supabase Setup

1. Create a new project at [Supabase](https://supabase.com)
2. Go to Project Settings > API
3. Copy the Project URL and paste it as `NEXT_PUBLIC_SUPABASE_URL`
4. Copy the `anon` public key and paste it as `NEXT_PUBLIC_SUPABASE_ANON_KEY`
5. Copy the `service_role` secret key and paste it as `SUPABASE_SERVICE_ROLE_KEY`

> **Note**: Supabase has deprecated the legacy API keys. If you see a warning about legacy keys in your Supabase dashboard, you should regenerate your API keys to use the new format.

## Running Development Server

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser.
