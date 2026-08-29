import type { APIRoute } from "astro";
import { createOrder, isBatchNumberTaken, isOrderNumberTaken, listCurrencies } from "@/lib/orders";
import { parseOrderForm, redirectToWithError } from "@/lib/orders-form";

export const POST: APIRoute = async (context) => {
  const user = context.locals.user;
  if (!user) {
    return context.redirect("/auth/signin");
  }

  const form = await context.request.formData();
  const result = parseOrderForm(form, {
    validCurrencyCodes: listCurrencies().map((c) => c.code),
  });
  if (!result.ok) {
    return redirectToWithError("/orders/new", result.error);
  }
  if (result.data.orderNumber && isOrderNumberTaken(result.data.orderNumber)) {
    return redirectToWithError("/orders/new", "Numer zamówienia jest już użyty w innym wpisie.");
  }
  if (result.data.batchNumber && isBatchNumberTaken(result.data.batchNumber)) {
    return redirectToWithError("/orders/new", "Numer partii jest już użyty w innym wpisie.");
  }

  try {
    createOrder({ ...result.data, createdBy: user.username });
  } catch {
    return redirectToWithError("/orders/new", "Nie udało się zapisać zamówienia — sprawdź wprowadzone dane.");
  }

  return context.redirect("/orders");
};
