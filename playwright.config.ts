import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { defineConfig, devices } from "@playwright/test";

const dir = mkdtempSync(join(tmpdir(), "mini-dm-e2e-"));
const PORT = 4322;

export const E2E_ADMIN_USERNAME = "admin";
export const E2E_ADMIN_PASSWORD = "test-password-123";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  reporter: "list",
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: "on-first-retry",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    // Dev mode, not build+preview: the sign-in cookie is set with `secure: import.meta.env.PROD`
    // (see src/pages/api/auth/signin.ts), so a production build served over plain HTTP would set
    // a Secure cookie the browser refuses to persist, breaking every E2E login. Dev mode also
    // skips a full production build per run, which is significantly faster for the test loop.
    command: `npm run dev -- --port ${PORT} --host localhost`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: {
      DATABASE_PATH: join(dir, "e2e.db"),
      ADMIN_USERNAME: E2E_ADMIN_USERNAME,
      ADMIN_PASSWORD: E2E_ADMIN_PASSWORD,
    },
  },
});
