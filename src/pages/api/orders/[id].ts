import type { APIRoute } from "astro";
import { getOrderById, isBatchNumberTaken, isOrderNumberTaken, listCurrencies, updateOrder } from "@/lib/orders";
import { parseOrderForm, redirectToWithError } from "@/lib/orders-form";

export const POST: APIRoute = async (context) => {
  const user = context.locals.user;
  if (!user) {
    return context.redirect("/auth/signin");
  }

  const id = Number(context.params.id);
  const order = Number.isInteger(id) ? getOrderById(id) : undefined;
  if (!order) {
    return context.redirect("/orders");
  }

  const form = await context.request.formData();
  const result = parseOrderForm(form, {
    validCurrencyCodes: listCurrencies().map((c) => c.code),
  });
  if (!result.ok) {
    return redirectToWithError(`/orders/${id}/edit`, result.error);
  }
  if (result.data.orderNumber && isOrderNumberTaken(result.data.orderNumber, id)) {
    return redirectToWithError(`/orders/${id}/edit`, "Numer zamówienia jest już użyty w innym wpisie.");
  }
  if (result.data.batchNumber && isBatchNumberTaken(result.data.batchNumber, id)) {
    return redirectToWithError(`/orders/${id}/edit`, "Numer partii jest już użyty w innym wpisie.");
  }

  try {
    updateOrder(id, { ...result.data, updatedBy: user.username });
  } catch {
    return redirectToWithError(`/orders/${id}/edit`, "Nie udało się zapisać zmian — sprawdź wprowadzone dane.");
  }

  return context.redirect("/orders");
};
