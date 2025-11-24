// tests/mocks/env-dynamic-private.ts
// SvelteKit's $env/dynamic/private shape for tests.
export const env = (globalThis.process?.env ?? {}) as Record<
  string,
  string | undefined
>
