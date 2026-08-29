import { parseMoneyToInt } from "@/lib/money";
import type { OrderInput } from "@/lib/orders";

function field(form: FormData, name: string): string {
  return ((form.get(name) as string | null) ?? "").trim();
}

function optionalField(form: FormData, name: string): string | null {
  const value = field(form, name);
  return value === "" ? null : value;
}

export type OrderFormParseResult = { ok: true; data: OrderInput } | { ok: false; error: string };

export interface OrderFormContext {
  validCurrencyCodes: string[];
}

export function parseOrderForm(form: FormData, context: OrderFormContext): OrderFormParseResult {
  const orderNumber = optionalField(form, "order_number");
  const productName = field(form, "product_name");
  const supplierName = field(form, "supplier_name");
  const quantityRaw = field(form, "quantity_kg");
  const portPriceRaw = field(form, "port_price_per_kg");
  const currencyCode = field(form, "currency_code").toUpperCase();
  const containerNumber = optionalField(form, "container_number");
  const etaPortDate = optionalField(form, "eta_port_date");
  const etaDestinationDate = optionalField(form, "eta_destination_date");
  const hasEur1Certificate = form.get("has_eur1_certificate") ? 1 : 0;
  const deliveredPriceRaw = optionalField(form, "delivered_price_per_kg");
  const batchNumber = optionalField(form, "batch_number");
  const sentForTestingDate = optionalField(form, "sent_for_testing_date");
  const testResults = optionalField(form, "test_results");
  const isBlocked = form.get("is_blocked") ? 1 : 0;
  const takenForProduction = form.get("taken_for_production") ? 1 : 0;
  const paymentDueDate = optionalField(form, "payment_due_date");
  const invoiceNumber = optionalField(form, "invoice_number");
  const paymentDate = optionalField(form, "payment_date");
  const deliveryDate = optionalField(form, "delivery_date");
  const isImportant = form.get("is_important") ? 1 : 0;
  const notes = optionalField(form, "notes");

  if (orderNumber && orderNumber.length !== 10) {
    return { ok: false, error: "Numer zamówienia musi mieć dokładnie 10 znaków." };
  }
  if (!productName || productName.length > 100) {
    return { ok: false, error: "Podaj nazwę towaru (maks. 100 znaków)." };
  }
  if (!supplierName || supplierName.length > 100) {
    return { ok: false, error: "Podaj nazwę dostawcy (maks. 100 znaków)." };
  }

  const quantityKg = Number(quantityRaw);
  if (!Number.isInteger(quantityKg) || quantityKg <= 0) {
    return { ok: false, error: "Ilość (kg) musi być liczbą całkowitą większą od 0." };
  }

  const portPricePerKg = parseMoneyToInt(portPriceRaw);
  if (portPricePerKg === null) {
    return { ok: false, error: "Cena portowa za kg jest nieprawidłowa." };
  }

  if (currencyCode.length !== 3) {
    return { ok: false, error: "Wybierz walutę." };
  }
  if (!context.validCurrencyCodes.includes(currencyCode)) {
    return { ok: false, error: "Wybrana waluta nie istnieje w słowniku walut." };
  }
  if (containerNumber && containerNumber.length > 50) {
    return { ok: false, error: "Numer kontenera może mieć maksymalnie 50 znaków." };
  }

  let deliveredPricePerKg: number | null = null;
  if (deliveredPriceRaw) {
    deliveredPricePerKg = parseMoneyToInt(deliveredPriceRaw);
    if (deliveredPricePerKg === null) {
      return { ok: false, error: "Cena po dostawie za kg jest nieprawidłowa." };
    }
  }
  if (batchNumber && batchNumber.length !== 13) {
    return { ok: false, error: "Numer partii musi mieć dokładnie 13 znaków." };
  }
  if (testResults && testResults.length > 50) {
    return { ok: false, error: "Wynik badań może mieć maksymalnie 50 znaków." };
  }
  if (invoiceNumber && invoiceNumber.length > 30) {
    return { ok: false, error: "Numer faktury może mieć maksymalnie 30 znaków." };
  }
  if (notes && notes.length > 512) {
    return { ok: false, error: "Uwagi mogą mieć maksymalnie 512 znaków." };
  }

  // order_value / delivered_order_value are never taken from the client — they're derived here so
  // they can't drift from quantity × price, and so the form fields showing them can stay read-only.
  const orderValue = quantityKg * portPricePerKg;
  const deliveredOrderValue = deliveredPricePerKg === null ? null : quantityKg * deliveredPricePerKg;

  return {
    ok: true,
    data: {
      orderNumber,
      productName,
      supplierName,
      quantityKg,
      portPricePerKg,
      orderValue,
      deliveredOrderValue,
      currencyCode,
      containerNumber,
      etaPortDate,
      etaDestinationDate,
      hasEur1Certificate,
      deliveredPricePerKg,
      batchNumber,
      sentForTestingDate,
      testResults,
      isBlocked,
      takenForProduction,
      paymentDueDate,
      invoiceNumber,
      paymentDate,
      deliveryDate,
      isImportant,
      notes,
    },
  };
}

export function redirectToWithError(path: string, message: string): Response {
  return new Response(null, {
    status: 303,
    headers: { Location: `${path}?error=${encodeURIComponent(message)}` },
  });
}
