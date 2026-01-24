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

# App URL (Required for OAuth redirect)
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

> **Important**: For production deployments, set `NEXT_PUBLIC_APP_URL` to your actual domain (e.g., `https://your-app.vercel.app`).

### Supabase Setup

1. Create a new project at [Supabase](https://supabase.com)
2. Go to Project Settings > API
3. Copy the Project URL and paste it as `NEXT_PUBLIC_SUPABASE_URL`
4. Copy the `anon` public key and paste it as `NEXT_PUBLIC_SUPABASE_ANON_KEY`
5. Copy the `service_role` secret key and paste it as `SUPABASE_SERVICE_ROLE_KEY`

> **Note**: Supabase has deprecated the legacy API keys. If you see a warning about legacy keys in your Supabase dashboard, you should regenerate your API keys to use the new format.

### OAuth Provider Setup (Google)

To enable Google sign-in, configure both Supabase and Google Cloud Console:

#### 1. Supabase Dashboard Settings

1. Go to your Supabase project > **Authentication** > **Providers**
2. Enable **Google** provider
3. Go to **Authentication** > **URL Configuration**
4. Add the following to **Redirect URLs**:
   - Development: `http://localhost:3000/auth/callback`
   - Production: `https://your-domain.com/auth/callback`

#### 2. Google Cloud Console Settings

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create or select a project
3. Navigate to **APIs & Services** > **Credentials**
4. Create an **OAuth 2.0 Client ID** (Web application)
5. Add **Authorized redirect URIs**:
   - `https://<your-supabase-project-ref>.supabase.co/auth/v1/callback`
6. Copy the **Client ID** and **Client Secret**
7. Paste them in Supabase Dashboard > Authentication > Providers > Google

#### Troubleshooting: redirect_uri_mismatch Error

If you see `Error 400: redirect_uri_mismatch`:
1. Verify `NEXT_PUBLIC_APP_URL` matches your actual app URL
2. Ensure the redirect URL is added in Supabase > Authentication > URL Configuration
3. Check that Google Cloud Console redirect URI matches your Supabase callback URL

## Running Development Server

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser.
