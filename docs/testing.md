# Testing Strategy

We follow industry standard testing practices.

## Unit Tests (Vitest)

Unit tests are **colocated** with the source code.
For a file named `example.ts`, the test file should be named `example.test.ts` and placed in the same directory.

**Running Unit Tests:**
```bash
pnpm test
```

## End-to-End Tests (Playwright)

E2E tests are located in the `tests/` directory at the project root.
Files should be named with the `.spec.ts` extension.

**Running E2E Tests:**
```bash
pnpm exec playwright test
```
