import type { APIRoute } from "astro";
import { deleteUser } from "@/lib/users";
import { redirectToWithError } from "@/lib/orders-form";

export const POST: APIRoute = async (context) => {
  const user = context.locals.user;
  if (!user) {
    return context.redirect("/auth/signin");
  }
  if (user.role !== "admin") {
    return new Response("Forbidden", { status: 403 });
  }

  const id = Number(context.params.id);
  if (!Number.isInteger(id)) {
    return context.redirect("/admin/users");
  }
  if (id === user.id) {
    return redirectToWithError("/admin/users", "Nie możesz usunąć własnego konta.");
  }

  const result = deleteUser(id);
  if (!result.ok) {
    return redirectToWithError("/admin/users", result.error);
  }

  return context.redirect("/admin/users");
};
