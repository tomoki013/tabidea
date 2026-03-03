# Unused Inventory (2026-03-03)

## Detection method

- `pnpm dlx knip --reporter compact`
- `rg -n` symbol/path checks for each candidate
- Excluded from deletion decision: Next.js/config/environment files

## Archived files

All files below were moved to `archive/unused/` because they had no active references in `src/` entry paths.

| Original path | New path | Reason |
| --- | --- | --- |
| `scripts/debug_feed.ts` | `archive/unused/scripts/debug_feed.ts` | Standalone debug script not called by package scripts |
| `src/components/AIPromotionBanner.tsx` | `archive/unused/src/components/AIPromotionBanner.tsx` | No imports/usages found |
| `src/components/SamplePlanActions.tsx` | `archive/unused/src/components/SamplePlanActions.tsx` | No imports/usages found |
| `src/components/billing/TicketCard.tsx` | `archive/unused/src/components/billing/TicketCard.tsx` | No imports/usages found |
| `src/components/billing/UpgradePromptBanner.tsx` | `archive/unused/src/components/billing/UpgradePromptBanner.tsx` | No imports/usages found |
| `src/components/billing/UserPlanStatus.tsx` | `archive/unused/src/components/billing/UserPlanStatus.tsx` | No imports/usages found |
| `src/components/common/Header/LegacyLogo.tsx` | `archive/unused/src/components/common/Header/LegacyLogo.tsx` | No imports/usages found |
| `src/components/features/index.ts` | `archive/unused/src/components/features/index.ts` | Barrel file not imported directly |
| `src/components/features/plan/index.ts` | `archive/unused/src/components/features/plan/index.ts` | Barrel file not imported directly |
| `src/components/features/planner/ActivityAccordion/**` | `archive/unused/src/components/features/planner/ActivityAccordion/**` | Entire module unused outside its own folder |
| `src/components/features/planner/ActivityFeedbackButton.tsx` | `archive/unused/src/components/features/planner/ActivityFeedbackButton.tsx` | No imports/usages found |
| `src/components/features/planner/GeneratingAnimation.tsx` | `archive/unused/src/components/features/planner/GeneratingAnimation.tsx` | No imports/usages found |
| `src/components/features/planner/JournalTimeline.tsx` | `archive/unused/src/components/features/planner/JournalTimeline.tsx` | No imports/usages found |
| `src/components/ui/LockedCategorySection.tsx` | `archive/unused/src/components/ui/LockedCategorySection.tsx` | No imports/usages found |
| `src/components/ui/OfflineWarning.tsx` | `archive/unused/src/components/ui/OfflineWarning.tsx` | No imports/usages found |
| `src/components/ui/StorageLimitWarning.tsx` | `archive/unused/src/components/ui/StorageLimitWarning.tsx` | No imports/usages found |
| `src/components/ui/index.ts` | `archive/unused/src/components/ui/index.ts` | Barrel file not imported directly |
| `src/context/FavoritesContext.tsx` | `archive/unused/src/context/FavoritesContext.tsx` | No imports/usages found |
| `src/lib/hooks/useOnlineStatus.ts` | `archive/unused/src/lib/hooks/useOnlineStatus.ts` | Used only by archived `OfflineWarning.tsx` |
| `src/lib/hooks/useStorageStatus.ts` | `archive/unused/src/lib/hooks/useStorageStatus.ts` | No imports/usages found |

## Retained candidates

Some `knip` candidates were retained because they are still relevant to app/runtime behavior:

- `next-sitemap.config.js`: used by `postbuild` (`next-sitemap`) flow.
- `src/lib/limits/tickets.ts`: used indirectly through billing checks.
- `src/lib/itinerary-generator.ts`: used by active internal tooling scripts.
- `src/lib/constants/*`, `src/lib/services/*`, `src/lib/supabase/index.ts`: mostly barrel/public API files likely referenced by internal modules and external tooling paths.
