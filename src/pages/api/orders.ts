import type { APIRoute } from "astro";
import { createOrder } from "@/lib/orders";
import { parseOrderForm, redirectToWithError } from "@/lib/orders-form";

export const POST: APIRoute = async (context) => {
  const user = context.locals.user;
  if (!user) {
    return context.redirect("/auth/signin");
  }

  const form = await context.request.formData();
  const result = parseOrderForm(form);
  if (!result.ok) {
    return redirectToWithError("/orders/new", result.error);
  }

  try {
    createOrder({ ...result.data, createdBy: user.username });
  } catch {
    return redirectToWithError("/orders/new", "Nie udało się zapisać zamówienia — sprawdź wprowadzone dane.");
  }

  return context.redirect("/orders");
};
