import type { APIRoute } from "astro";
import { getOrderById, listCurrencies, updateOrder } from "@/lib/orders";
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

  try {
    updateOrder(id, { ...result.data, updatedBy: user.username });
  } catch {
    return redirectToWithError(`/orders/${id}/edit`, "Nie udało się zapisać zmian — sprawdź wprowadzone dane.");
  }

  return context.redirect("/orders");
};
