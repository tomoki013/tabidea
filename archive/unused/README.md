# Unused Archive

This directory stores files moved out of the active codebase during cleanup.

## Purpose

- Keep the main project tree focused on active code.
- Preserve unused files for safe rollback and review.
- Avoid hard-deleting potentially recoverable assets.

## Structure

- Original relative paths are preserved under `archive/unused/`.
- Example:
  - `src/components/AIPromotionBanner.tsx`
  - `archive/unused/src/components/AIPromotionBanner.tsx`

## Restore

To restore a file, move it back to its original path:

```bash
git mv archive/unused/<original-path> <original-path>
```

## Notes

- `tsconfig.json` excludes `archive` so archived TypeScript files are not type-checked.
- Archived tests are intentionally not executed by Vitest (`src/**/*.test.*`).
