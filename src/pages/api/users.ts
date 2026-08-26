import type { APIRoute } from "astro";
import { createUser } from "@/lib/users";
import { redirectToWithError } from "@/lib/orders-form";

export const POST: APIRoute = async (context) => {
  const user = context.locals.user;
  if (!user) {
    return context.redirect("/auth/signin");
  }
  if (user.role !== "admin") {
    return new Response("Forbidden", { status: 403 });
  }

  const form = await context.request.formData();
  const username = (form.get("username") as string | null) ?? "";
  const password = (form.get("password") as string | null) ?? "";
  const role = form.get("role") === "admin" ? "admin" : "user";

  const result = createUser(username, password, role);
  if (!result.ok) {
    return redirectToWithError("/admin/users", result.error);
  }

  return context.redirect("/admin/users");
};
