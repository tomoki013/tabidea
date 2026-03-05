# Internationalization Baseline (2026-03)

## Scope

- URL strategy: language-only prefix (`/{locale}`, e.g. `/ja`, `/en`)
- Internal locale: regional locale (`ja-JP`, `en-US`)
- Default language/locale: `ja` / `ja-JP`
- User preference persistence: `public.users.metadata` (`preferredLanguage`, `preferredRegion`, `preferredLocale`, `homeBaseCity`)
- Supported languages are generated from `src/messages/*` directories.
  - Generated file: [`src/lib/i18n/generated-locales.ts`](/C:/Users/tomoki_ttttt/Next.js/Tabidea/tabidea/src/lib/i18n/generated-locales.ts)

## Routing design

- Entry paths without language prefix are redirected based on resolved language.
  - Example: `/pricing` -> `/en/pricing` (if resolved language is `en`)
- URL prefix language is treated as an explicit user choice.
  - Example: `/en/pricing` is preserved even when `preferredLanguage` is `ja`
- UI pages are implemented under `src/app/[locale]/*`.
  - Example: `/ja/pricing` maps to `src/app/[locale]/(marketing)/pricing/page.tsx`
- Excluded from locale routing:
  - `/api/*`
  - `/auth/callback`
  - `/auth/logout`
  - Next.js static assets and public files

Implementation: [`src/proxy.ts`](/C:/Users/tomoki_ttttt/Next.js/Tabidea/tabidea/src/proxy.ts)

Language resolution priority (high -> low):

1. URL prefix language (explicit route language)
2. Logged-in user metadata (`preferredLanguage`) when URL prefix is absent
3. Cookie (`tabidea-language`) when URL prefix is absent
4. Request header (`Accept-Language`) when URL prefix is absent
5. Default language (`ja`)

Region resolution priority (high -> low):

1. Logged-in user metadata (`preferredRegion`)
2. Cookie (`tabidea-region`)
3. Request headers (`x-vercel-ip-country`, `cf-ipcountry`)
4. Default region (`JP` for `ja`, `US` for `en`)

When logged in and metadata is missing, proxy auto-persists detected language/region once.

## Locale model

Implementation: [`src/lib/i18n/locales.ts`](/C:/Users/tomoki_ttttt/Next.js/Tabidea/tabidea/src/lib/i18n/locales.ts)
Region dataset: [`src/lib/i18n/regions.ts`](/C:/Users/tomoki_ttttt/Next.js/Tabidea/tabidea/src/lib/i18n/regions.ts)

- `LanguageCode`: `ja | en`
- `RegionCode`: `JP` + MOFA country/region codes (settings options: total 208 entries)
- `RegionalLocale`: `ja-JP | en-US`

Resolution rules:

1. Language changes auto-assign default region.
2. Region can be edited independently in settings (region list is generated from `regions.ts`).
3. `homeBaseCity` is auto-filled on region change, preferring configured capital overrides and falling back to region name.
4. Unsupported language-region combinations fall back to that language's default regional locale.

## Messages

- Message dictionaries live in:
  - `src/messages/ja/**.json`
  - `src/messages/en/**.json`
- Messages are loaded by recursively merging locale directories.
  - Implementation: [`src/lib/i18n/load-messages.ts`](/C:/Users/tomoki_ttttt/Next.js/Tabidea/tabidea/src/lib/i18n/load-messages.ts)
  - Entry point: [`src/lib/i18n/messages.ts`](/C:/Users/tomoki_ttttt/Next.js/Tabidea/tabidea/src/lib/i18n/messages.ts)
- Provider setup is in [`src/app/layout.tsx`](/C:/Users/tomoki_ttttt/Next.js/Tabidea/tabidea/src/app/layout.tsx).
- Translation key consistency is verified by `pnpm i18n:check`.
  - Script: [`scripts/i18n/check-messages.ts`](/C:/Users/tomoki_ttttt/Next.js/Tabidea/tabidea/scripts/i18n/check-messages.ts)
  - Locales are discovered from `src/messages/*` directories (reference locale: `ja`).
- Locale list sync is done by `pnpm i18n:sync-locales`.
  - Script: [`scripts/i18n/generate-locales.ts`](/C:/Users/tomoki_ttttt/Next.js/Tabidea/tabidea/scripts/i18n/generate-locales.ts)
  - This script runs automatically via `predev`, `prebuild`, `pretest`, and `prei18n:check`.

## Settings persistence

Implementation: [`src/app/actions/user-settings.ts`](/C:/Users/tomoki_ttttt/Next.js/Tabidea/tabidea/src/app/actions/user-settings.ts)

Saved metadata keys:

- `preferredLanguage`
- `preferredRegion`
- `preferredLocale`
- `homeBaseCity`

AI generation behavior linked to settings:

- Plan output language follows `preferredLanguage` (ja/en).
- The itinerary is instructed to start from `homeBaseCity` and return to the same city on the final day.

UI entry point:

- [`src/components/common/SettingsModal.tsx`](/C:/Users/tomoki_ttttt/Next.js/Tabidea/tabidea/src/components/common/SettingsModal.tsx)

## Future expansion

- Add regional locales (e.g. `en-GB`) by extending locale mappings.
- Improve English labels and capital overrides for all region entries.
- Gradually migrate page-level strings and metadata to dictionary keys.
