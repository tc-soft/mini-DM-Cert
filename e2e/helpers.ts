import type { Page } from "@playwright/test";

export async function signIn(page: Page, username: string, password: string): Promise<void> {
  await page.goto("/auth/signin");
  await page.locator("#username").fill(username);
  await page.locator("#password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL(/\/dashboard/);
}
