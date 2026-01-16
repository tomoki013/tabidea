Please use `pnpm` for all package management commands.

## Testing Guidelines

We follow industry standard testing practices using **colocation** for unit tests.
- Place unit tests (`*.test.ts/tsx`) in the same directory as the source file.
- Do not create `__tests__` directories.
- E2E tests are located in `tests/` directory.

Run unit tests: `pnpm test`
