import type { APIRoute } from "astro";
import { createOrder } from "@/lib/orders";
import { parseMoneyToInt } from "@/lib/money";

function field(form: FormData, name: string): string {
  return ((form.get(name) as string | null) ?? "").trim();
}

function optionalField(form: FormData, name: string): string | null {
  const value = field(form, name);
  return value === "" ? null : value;
}

function fail(message: string) {
  return new Response(null, {
    status: 303,
    headers: { Location: `/orders/new?error=${encodeURIComponent(message)}` },
  });
}

export const POST: APIRoute = async (context) => {
  const user = context.locals.user;
  if (!user) {
    return context.redirect("/auth/signin");
  }

  const form = await context.request.formData();

  const orderNumber = optionalField(form, "order_number");
  const productName = field(form, "product_name");
  const supplierName = field(form, "supplier_name");
  const quantityRaw = field(form, "quantity_kg");
  const portPriceRaw = field(form, "port_price_per_kg");
  const orderValueRaw = field(form, "order_value");
  const currencyCode = field(form, "currency_code").toUpperCase();
  const containerNumber = optionalField(form, "container_number");
  const etaPortDate = optionalField(form, "eta_port_date");
  const etaDestinationDate = optionalField(form, "eta_destination_date");
  const hasEur1Certificate = form.get("has_eur1_certificate") ? 1 : 0;
  const notes = optionalField(form, "notes");

  if (orderNumber && orderNumber.length !== 10) {
    return fail("Numer zamówienia musi mieć dokładnie 10 znaków.");
  }
  if (!productName || productName.length > 100) {
    return fail("Podaj nazwę towaru (maks. 100 znaków).");
  }
  if (!supplierName || supplierName.length > 100) {
    return fail("Podaj nazwę dostawcy (maks. 100 znaków).");
  }

  const quantityKg = Number(quantityRaw);
  if (!Number.isInteger(quantityKg) || quantityKg <= 0) {
    return fail("Ilość (kg) musi być liczbą całkowitą większą od 0.");
  }

  const portPricePerKg = parseMoneyToInt(portPriceRaw);
  if (portPricePerKg === null) {
    return fail("Cena portowa za kg jest nieprawidłowa.");
  }

  const orderValue = parseMoneyToInt(orderValueRaw);
  if (orderValue === null) {
    return fail("Wartość zamówienia jest nieprawidłowa.");
  }

  if (currencyCode.length !== 3) {
    return fail("Wybierz walutę.");
  }
  if (containerNumber && containerNumber.length > 50) {
    return fail("Numer kontenera może mieć maksymalnie 50 znaków.");
  }
  if (notes && notes.length > 512) {
    return fail("Uwagi mogą mieć maksymalnie 512 znaków.");
  }

  try {
    createOrder({
      orderNumber,
      productName,
      supplierName,
      quantityKg,
      portPricePerKg,
      orderValue,
      currencyCode,
      containerNumber,
      etaPortDate,
      etaDestinationDate,
      hasEur1Certificate,
      notes,
      createdBy: user.username,
    });
  } catch {
    return fail("Nie udało się zapisać zamówienia — sprawdź wprowadzone dane.");
  }

  return context.redirect("/orders");
};
