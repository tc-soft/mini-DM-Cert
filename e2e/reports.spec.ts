import { E2E_ADMIN_PASSWORD, E2E_ADMIN_USERNAME } from "../playwright.config";
import { expect, signIn, test, waitForHydration } from "./helpers";

test.describe("reports (FR-009)", () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page, E2E_ADMIN_USERNAME, E2E_ADMIN_PASSWORD);
  });

  test("a date-ranged report includes a matching order and sums its value into that currency's total", async ({
    page,
  }) => {
    const uniqueProduct = `E2E Raport ${Date.now()}`;
    const today = new Date().toISOString().slice(0, 10);

    await page.goto("/orders/new");
    await waitForHydration(page);
    await page.locator("#supplier_name").fill("E2E Dostawca");
    await page.locator("#product_name").fill(uniqueProduct);
    await page.locator("#quantity_kg").fill("10");
    await page.locator("#port_price_per_kg").fill("100");
    await page.locator("#currency_code").selectOption("EUR");
    await page.locator("#eta_destination_date").fill(today);
    await page.getByRole("button", { name: "Zapisz zamówienie" }).click();
    await expect(page).toHaveURL(/\/orders$/);

    await page.goto(`/reports?from=${today}&to=${today}`);

    await expect(page.locator("tbody", { hasText: uniqueProduct })).toBeVisible();

    // quantity(10) * price(100) = 1000.00 EUR. Confirmed via a real CI failure that this
    // Node/ICU build's pl-PL thousands separator for a 4-digit number is empty ("1000,00"),
    // not a plain or non-breaking space, so `\s?` covers zero-or-one separator character.
    const totalsTile = page.locator("div.mb-4.flex.flex-wrap.gap-3").first();
    await expect(totalsTile).toContainText(/1\s?000,00.*EUR/);
  });
});
