// Stand-in for the `astro:env/server` virtual module, used only in tests (see vitest.config.ts
// resolve.alias). Astro's real implementation snapshots process.env into generated code at Vite's
// first transform of that module and caches it for the life of the dev/test server — it does NOT
// re-read process.env per import. That broke per-test-file DB isolation: every test file ended up
// sharing whatever value was baked in first, which in practice was undefined, so `src/lib/db.ts`
// fell back to the real project database and wrote test data into it.
//
// This stub is a plain live read, so each test file's isolated module registry (Vitest's
// `isolate: true`) re-evaluates it fresh and picks up whatever tests/setup.ts just set.
export const DATABASE_PATH = process.env.DATABASE_PATH;
export const ADMIN_USERNAME = process.env.ADMIN_USERNAME;
export const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
