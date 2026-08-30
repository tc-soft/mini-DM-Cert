import { E2E_ADMIN_PASSWORD, E2E_ADMIN_USERNAME } from "../playwright.config";
import { expect, signIn, test, waitForHydration } from "./helpers";

test.describe("orders", () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page, E2E_ADMIN_USERNAME, E2E_ADMIN_PASSWORD);
  });

  test("create, list, search and edit an order, recording change history (FR-002/003/004/005/010)", async ({
    page,
  }) => {
    const uniqueProduct = `E2E Owoc ${Date.now()}`;
    const changedProduct = `${uniqueProduct} zmieniony`;

    await page.goto("/orders/new");
    await waitForHydration(page);
    await page.locator("#supplier_name").fill("E2E Dostawca");
    await page.locator("#product_name").fill(uniqueProduct);
    await page.locator("#quantity_kg").fill("100");
    await page.locator("#port_price_per_kg").fill("2.5");
    await page.locator("#currency_code").selectOption("EUR");
    await page.getByRole("button", { name: "Zapisz zamówienie" }).click();

    await expect(page).toHaveURL(/\/orders$/);
    await expect(page.getByText(uniqueProduct, { exact: true })).toBeVisible();

    // FR-005: search narrows the table down to the matching row.
    await page.locator("#q").fill(uniqueProduct);
    await page.getByRole("button", { name: "Filtruj" }).click();
    const row = page.locator("tbody tr", { hasText: uniqueProduct });
    await expect(row).toHaveCount(1);

    // FR-003: edit through the form.
    await row.getByRole("link", { name: "Edytuj" }).click();
    await expect(page).toHaveURL(/\/orders\/\d+\/edit/);
    await waitForHydration(page);
    await page.locator("#product_name").fill(changedProduct);
    await page.getByRole("button", { name: "Zapisz zmiany" }).click();

    // FR-010: the edit is recorded in the order's change history.
    await expect(page).toHaveURL(/\/orders$/);
    await page.locator("tbody tr", { hasText: changedProduct }).getByRole("link", { name: "Edytuj" }).click();
    await expect(page.getByText("Historia zmian")).toBeVisible();
    await expect(page.getByText("Towar:")).toBeVisible();
  });
});
