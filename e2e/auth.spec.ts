import { E2E_ADMIN_PASSWORD, E2E_ADMIN_USERNAME } from "../playwright.config";
import { expect, test } from "./helpers";

test.describe("sign in (FR-001)", () => {
  test("valid credentials redirect to the dashboard", async ({ page }) => {
    await page.goto("/auth/signin");
    await page.locator("#username").fill(E2E_ADMIN_USERNAME);
    await page.locator("#password").fill(E2E_ADMIN_PASSWORD);
    await page.getByRole("button", { name: "Sign in" }).click();

    await expect(page).toHaveURL(/\/dashboard/);
  });

  test("wrong password shows an error and stays on the sign-in page", async ({ page }) => {
    await page.goto("/auth/signin");
    await page.locator("#username").fill(E2E_ADMIN_USERNAME);
    await page.locator("#password").fill("wrong-password");
    await page.getByRole("button", { name: "Sign in" }).click();

    await expect(page).toHaveURL(/\/auth\/signin/);
    await expect(page.getByText(/invalid username or password/i)).toBeVisible();
  });
});
