# Environment Variables

更新日: 2026-03-06

このドキュメントは、コード上で参照されている環境変数のカタログです。  
This list is based on current `process.env.*` references in the repository.

## 1. 必須（主要） / Primary Required

| Variable | Scope | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Client/Server | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Client/Server | Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Server | Supabase admin operations |
| `GOOGLE_GENERATIVE_AI_API_KEY` | Server | Gemini API access |
| `OPENAI_API_KEY` | Server | OpenAI API access (optional alternative to Gemini) |
| `SAMPLE_GOOGLE_GENERATIVE_AI_API_KEY` | Server (scripts) | Sample itinerary generation dedicated Gemini key (optional, falls back to `GOOGLE_GENERATIVE_AI_API_KEY`) |
| `SAMPLE_OPENAI_API_KEY` | Server (scripts) | Sample itinerary generation dedicated OpenAI key (optional, falls back to `OPENAI_API_KEY`) |

## 2. AI/Model Selection

- `AI_DEFAULT_PROVIDER`
- `AI_PROVIDER`
- `AI_PROVIDER_ITINERARY`
- `AI_STRATEGY_ITINERARY`
- `GOOGLE_MODEL_NAME`
- `GOOGLE_MODEL_FLASH`
- `GOOGLE_MODEL_PRO`
- `OPENAI_MODEL_NAME`
- `OPENAI_MODEL_ITINERARY`
- `OPENAI_MODEL_ITINERARY_PRO`
- `AI_MODEL_OUTLINE_FREE`
- `AI_MODEL_OUTLINE_PRO`
- `AI_MODEL_OUTLINE_PRO_GEMINI`
- `AI_MODEL_CHUNK_PREMIUM_OPENAI`
- `AI_MODEL_SPOT_EXTRACTION`
- `AI_MODEL_SPOT_EXTRACTION_GEMINI`
- `AI_MODEL_SPOT_EXTRACTION_OPENAI`

## 3. Travel Planning / External Data

- `UNSPLASH_ACCESS_KEY`
- `PINECONE_API_KEY`
- `PINECONE_INDEX`
- `GEMINI_EMBEDDING_MODEL`
- `WEATHER_API_KEY`
- `EXCHANGE_API_KEY`
- `REDIS_URL`
- `UPSTASH_REDIS_REST_URL`
- `UPSTASH_REDIS_REST_TOKEN`

## 4. Mapping / Places

- `GOOGLE_MAPS_API_KEY` (server side places search/validation)
- `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` (client side map UI)

## 5. Billing / Stripe

- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `STRIPE_PRICE_PRO_MONTHLY`
- `STRIPE_PRICE_PREMIUM_MONTHLY`
- `STRIPE_PRICE_TICKET_1`
- `STRIPE_PRICE_TICKET_5`
- `STRIPE_PRICE_TICKET_10`

## 6. External Search Provider

- `AMADEUS_CLIENT_ID`
- `AMADEUS_CLIENT_SECRET`
- `AMADEUS_BASE_URL`

## 7. Auth / URL / Admin

- `NEXT_PUBLIC_APP_URL`
- `NEXT_PUBLIC_SITE_URL`
- `ADMIN_EMAILS`
- `DEBUG_PAGE_PASSWORD`

## 8. Affiliate IDs (Client)

- `NEXT_PUBLIC_RAKUTEN_AFFILIATE_ID`
- `NEXT_PUBLIC_BOOKING_AFFILIATE_ID`
- `NEXT_PUBLIC_JALAN_AFFILIATE_ID`
- `NEXT_PUBLIC_SKYSCANNER_AFFILIATE_ID`
- `NEXT_PUBLIC_TRIP_COM_AFFILIATE_ID`
- `NEXT_PUBLIC_KLOOK_AFFILIATE_ID`

## 9. Email / Misc

- `GMAIL_USER`
- `GMAIL_PASS`
- `ENCRYPTION_MASTER_SECRET`
- `ENABLE_SPOT_VALIDATION`
- `NEXT_PUBLIC_CHAT_MODEL_NAME`
- `NODE_ENV`

## 10. Security Notes

1. `NEXT_PUBLIC_` 以外はクライアントに露出させない。
2. API keyやsecretをログ出力しない。
3. `.env.local` はGit管理しない。
4. 本番キーはCI/CDシークレットで管理する。

## 11. Maintenance

新しい環境変数を追加した場合は:

1. `development/env-vars.md` 更新
2. 必要なら `development/setup-and-operations.md` 更新
3. 仕様に影響する場合は `docs/README.md` の運用ルールに従い同一PRで反映
