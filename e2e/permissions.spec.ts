import { E2E_ADMIN_PASSWORD, E2E_ADMIN_USERNAME } from "../playwright.config";
import { expect, signIn, test } from "./helpers";

test.describe("permission split: admin vs regular user", () => {
  test("a regular user can manage dictionaries but not user accounts or delete orders", async ({ page }) => {
    const username = `e2e-user-${Date.now()}`;
    const password = "test-password-123";

    await signIn(page, E2E_ADMIN_USERNAME, E2E_ADMIN_PASSWORD);
    await page.goto("/admin/users");
    await page.locator("#username").fill(username);
    await page.locator("#password").fill(password);
    await page.getByRole("button", { name: "Utwórz konto" }).click();
    await expect(page.getByText(username)).toBeVisible();

    await page.getByRole("button", { name: "Wyloguj" }).click();
    await signIn(page, username, password);

    // FR-011 (2026-08-30 decision): dictionary management is open to any logged-in user.
    await page.goto("/admin/dictionaries");
    await expect(page).toHaveURL(/\/admin\/dictionaries/);
    await expect(page.getByRole("heading", { name: "Słowniki" })).toBeVisible();

    // FR-007: user account management stays admin-only — redirected away.
    await page.goto("/admin/users");
    await expect(page).toHaveURL(/\/orders/);

    // FR-006: order deletion stays admin-only — no delete action rendered at all.
    await page.goto("/orders");
    await expect(page.getByRole("button", { name: "Usuń" })).toHaveCount(0);
  });
});
