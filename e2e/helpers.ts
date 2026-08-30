import { test as base, expect } from "@playwright/test";
import type { Page } from "@playwright/test";

// Diagnostic-only: the first CI run showed later tests silently failing to reach the server at
// all (no corresponding request in the dev server's own log), which points at a client-side JS
// failure (e.g. a React hydration error) rather than a server crash. Surfacing browser console
// output, uncaught page errors, and failed network requests directly in the test log so the next
// failure is diagnosable from the same "Run npm run test:e2e" CI output without another round trip.
export const test = base.extend<object>({
  // Playwright's fixture-callback parameter is conventionally named `use`, which
  // eslint-plugin-react-hooks mistakes for React's `use()` hook — renamed to sidestep that.
  page: async ({ page }, provide) => {
    page.on("console", (msg) => {
      // eslint-disable-next-line no-console -- diagnostic output for CI, not app code
      console.log(`[browser:${msg.type()}] ${msg.text()}`);
    });
    page.on("pageerror", (err) => {
      // eslint-disable-next-line no-console -- diagnostic output for CI, not app code
      console.log(`[pageerror] ${err.stack ?? err.message}`);
    });
    page.on("requestfailed", (req) => {
      // eslint-disable-next-line no-console -- diagnostic output for CI, not app code
      console.log(`[requestfailed] ${req.method()} ${req.url()} — ${req.failure()?.errorText}`);
    });
    await provide(page);
  },
});

export { expect };

export async function signIn(page: Page, username: string, password: string): Promise<void> {
  await page.goto("/auth/signin");
  await page.locator("#username").fill(username);
  await page.locator("#password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL(/\/dashboard/);
}
