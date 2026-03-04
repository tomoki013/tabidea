# Internationalization Baseline (2026-03)

## Scope

- URL strategy: language-only prefix (`/ja`, `/en`)
- Internal locale: regional locale (`ja-JP`, `en-US`)
- Default language/locale: `ja` / `ja-JP`
- User preference persistence: `public.users.metadata` (`preferredLanguage`, `preferredRegion`, `preferredLocale`)

## Routing design

- Entry paths without language prefix are redirected to default language.
  - Example: `/pricing` -> `/ja/pricing`
- UI pages are implemented under `src/app/[locale]/*`.
  - Example: `/ja/pricing` maps to `src/app/[locale]/(marketing)/pricing/page.tsx`
- Excluded from locale routing:
  - `/api/*`
  - `/auth/callback`
  - `/auth/logout`
  - Next.js static assets and public files

Implementation: [`src/proxy.ts`](/C:/Users/tomoki_ttttt/Next.js/Tabidea/tabidea/src/proxy.ts)

## Locale model

Implementation: [`src/lib/i18n/locales.ts`](/C:/Users/tomoki_ttttt/Next.js/Tabidea/tabidea/src/lib/i18n/locales.ts)

- `LanguageCode`: `ja | en`
- `RegionCode`: `JP | US`
- `RegionalLocale`: `ja-JP | en-US`

Resolution rules:

1. Language changes auto-assign default region.
2. Region can be edited independently in settings.
3. Unsupported language-region combinations fall back to that language's default regional locale.

## Messages

- Message dictionaries live in:
  - [`src/messages/ja.json`](/C:/Users/tomoki_ttttt/Next.js/Tabidea/tabidea/src/messages/ja.json)
  - [`src/messages/en.json`](/C:/Users/tomoki_ttttt/Next.js/Tabidea/tabidea/src/messages/en.json)
- Provider setup is in [`src/app/layout.tsx`](/C:/Users/tomoki_ttttt/Next.js/Tabidea/tabidea/src/app/layout.tsx).

## Settings persistence

Implementation: [`src/app/actions/user-settings.ts`](/C:/Users/tomoki_ttttt/Next.js/Tabidea/tabidea/src/app/actions/user-settings.ts)

Saved metadata keys:

- `preferredLanguage`
- `preferredRegion`
- `preferredLocale`

UI entry point:

- [`src/components/common/SettingsModal.tsx`](/C:/Users/tomoki_ttttt/Next.js/Tabidea/tabidea/src/components/common/SettingsModal.tsx)

## Future expansion

- Add regional locales (e.g. `en-GB`) by extending locale mappings.
- Expand region candidate lists per language in settings.
- Gradually migrate page-level strings and metadata to dictionary keys.
