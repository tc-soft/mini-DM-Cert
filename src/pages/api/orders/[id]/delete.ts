import type { APIRoute } from "astro";
import { deleteOrder, getOrderById } from "@/lib/orders";

export const POST: APIRoute = async (context) => {
  const user = context.locals.user;
  if (!user) {
    return context.redirect("/auth/signin");
  }
  if (user.role !== "admin") {
    return new Response("Forbidden", { status: 403 });
  }

  const id = Number(context.params.id);
  if (Number.isInteger(id) && getOrderById(id)) {
    deleteOrder(id);
  }

  return context.redirect("/orders");
};
