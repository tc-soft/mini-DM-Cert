import { describe, expect, it } from "vitest";
import { parseOrderForm, type OrderFormContext } from "@/lib/orders-form";

const context: OrderFormContext = { validCurrencyCodes: ["EUR", "USD"] };

function formWith(overrides: Record<string, string>): FormData {
  const base: Record<string, string> = {
    product_name: "Jabłka",
    supplier_name: "Acme Fruits",
    quantity_kg: "1000",
    port_price_per_kg: "1.5",
    currency_code: "EUR",
  };
  const form = new FormData();
  for (const [key, value] of Object.entries({ ...base, ...overrides })) {
    form.set(key, value);
  }
  return form;
}

describe("parseOrderForm", () => {
  it("accepts a valid submission and derives order_value from quantity * price", () => {
    const result = parseOrderForm(formWith({}), context);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.orderValue).toBe(1000 * 15000);
      expect(result.data.currencyCode).toBe("EUR");
      expect(result.data.deliveredOrderValue).toBeNull();
    }
  });

  it("rejects a non-integer or non-positive quantity", () => {
    expect(parseOrderForm(formWith({ quantity_kg: "0" }), context).ok).toBe(false);
    expect(parseOrderForm(formWith({ quantity_kg: "1.5" }), context).ok).toBe(false);
    expect(parseOrderForm(formWith({ quantity_kg: "-10" }), context).ok).toBe(false);
  });

  it("rejects an order_number that isn't exactly 10 characters", () => {
    const result = parseOrderForm(formWith({ order_number: "short" }), context);
    expect(result.ok).toBe(false);
  });

  it("accepts an order_number that is exactly 10 characters", () => {
    const result = parseOrderForm(formWith({ order_number: "AB12345678" }), context);
    expect(result.ok).toBe(true);
  });

  it("rejects a currency not present in the dictionary", () => {
    const result = parseOrderForm(formWith({ currency_code: "GBP" }), context);
    expect(result.ok).toBe(false);
  });

  it("uppercases the currency code before validating it", () => {
    const result = parseOrderForm(formWith({ currency_code: "eur" }), context);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data.currencyCode).toBe("EUR");
  });

  it("rejects an invalid port price", () => {
    const result = parseOrderForm(formWith({ port_price_per_kg: "not-a-number" }), context);
    expect(result.ok).toBe(false);
  });

  it("rejects an over-length product name", () => {
    const result = parseOrderForm(formWith({ product_name: "x".repeat(101) }), context);
    expect(result.ok).toBe(false);
  });

  it("computes delivered_order_value only when a delivered price is provided", () => {
    const result = parseOrderForm(formWith({ delivered_price_per_kg: "2" }), context);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data.deliveredOrderValue).toBe(1000 * 20000);
  });

  it("rejects a batch_number that isn't exactly 13 characters", () => {
    const result = parseOrderForm(formWith({ batch_number: "tooshort" }), context);
    expect(result.ok).toBe(false);
  });
});
