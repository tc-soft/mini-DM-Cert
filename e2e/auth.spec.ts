import { E2E_ADMIN_PASSWORD, E2E_ADMIN_USERNAME } from "../playwright.config";
import { expect, test, waitForHydration } from "./helpers";

test.describe("sign in (FR-001)", () => {
  test("valid credentials redirect to the dashboard", async ({ page }) => {
    await page.goto("/auth/signin");
    await waitForHydration(page);
    await page.locator("#username").fill(E2E_ADMIN_USERNAME);
    await page.locator("#password").fill(E2E_ADMIN_PASSWORD);
    await page.getByRole("button", { name: "Sign in" }).click();

    await expect(page).toHaveURL(/\/dashboard/);
  });

  test("wrong password shows an error and stays on the sign-in page", async ({ page }) => {
    await page.goto("/auth/signin");
    await waitForHydration(page);
    await page.locator("#username").fill(E2E_ADMIN_USERNAME);
    await page.locator("#password").fill("wrong-password");
    await page.getByRole("button", { name: "Sign in" }).click();

    await expect(page).toHaveURL(/\/auth\/signin/);
    // Scoped to the actual error banner (ServerError.tsx renders it as p.text-red-300): a plain
    // getByText also matches Astro's dev-mode toolbar, which shows the page's props as debug JSON.
    await expect(page.locator("p.text-red-300")).toContainText(/invalid username or password/i);
  });
});
