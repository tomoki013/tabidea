# Repository Guidelines

## Project Structure & Module Organization
Main code lives in `src/`:
- `src/app`: Next.js App Router pages and API routes
- `src/components/ui`: reusable presentational UI (no business logic)
- `src/components/common`: shared app components
- `src/components/features`: feature-specific components
- `src/lib/services`: domain/service logic
- `src/lib/utils`, `src/lib/hooks`, `src/context`, `src/types`: utilities, hooks, context, and types

Other key directories: `public/` (static assets), `docs/` (project/development/reference docs), `supabase/` (DB schema/migrations), `tests/` (Playwright E2E).

## Build, Test, and Development Commands
Use `pnpm` for all commands:
- `pnpm dev`: start local development server
- `pnpm build`: production build (`postbuild` runs sitemap generation)
- `pnpm start`: run built app
- `pnpm lint`: run ESLint (Next.js + TypeScript rules)
- `pnpm test`: run Vitest unit/component tests
- `pnpm exec playwright test`: run E2E tests in `tests/`
- `pnpm docs:catalog`: regenerate `docs/reference/file-catalog.md`

## Coding Style & Naming Conventions
TypeScript strict mode is enabled. Use `@/*` alias imports (`@/` -> `src/`), 2-space indentation, and semicolons.

- Components/types: PascalCase (`CategorySelector.tsx`, `UserInput`)
- Utilities: kebab-case (`http-client.ts`)
- Hooks: `use` + camelCase (`useSpotCoordinates.ts`)
- Constants: SCREAMING_SNAKE_CASE (`MAX_RETRY_COUNT`)
- Route files: `page.tsx`, `layout.tsx`, `route.ts`

Import order: React/Next -> external libs -> type imports -> services/utils -> hooks -> components -> relative imports.

## Testing Guidelines
Unit tests follow colocation: create `*.test.ts` / `*.test.tsx` next to source files under `src/`. Avoid creating new `__tests__` directories.

Use Vitest + Testing Library for unit/component tests and Playwright for E2E. Keep tests deterministic and mock external APIs/services where possible.

## Documentation & Performance Requirements
If a PR changes behavior, architecture, API/service contracts, DB schema, or testing policy, update relevant `docs/` files in the same PR.

For every PR/commit that changes behavior or user-facing content, always update `CHANGELOG.md` in the same PR/commit. `CHANGELOG.md` is the single source of truth for update history, and `src/app/[locale]/(marketing)/updates/page.tsx` is a user-facing summary view derived from that history.

For server actions and AI generation flows, performance instrumentation is required via `PerformanceTimer` (`src/lib/utils/performance-timer.ts`): measure key steps with `timer.measure(...)` and call `timer.log()` on completion.

For any UI change (new page/component or style update), dark mode support is mandatory in the same PR/commit. Do not ship light-only UI. Ensure both light and dark themes are visually verified before merge.

For any UI change (new page/component/content update), multilingual support is mandatory in the same PR/commit. Do not ship Japanese-only UI. All user-facing UI (pages, modals, toasts, OG/PDF text) must be implemented with i18n keys and support at least `ja` and `en`.

## Commit & Pull Request Guidelines
Prefer Conventional Commit-style subjects (`feat:`, `fix:`, `refactor:`, `chore:`, `perf:`). Keep commits focused and imperative.

PRs should include: change summary, reason, linked issue/PR, validation run (`pnpm lint`, `pnpm test`, and E2E when relevant), screenshots for UI changes, and notes for env var or `supabase` migration updates.

## Project Notes
- User-facing content is Japanese by default.
- See `docs/development/architecture.md` and `docs/development/testing.md` for deeper guidance.
