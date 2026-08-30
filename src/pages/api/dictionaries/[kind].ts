import type { APIRoute } from "astro";
import { createDictionaryEntry, isDictionaryKind } from "@/lib/dictionaries";
import { redirectToWithError } from "@/lib/orders-form";

export const POST: APIRoute = async (context) => {
  const user = context.locals.user;
  if (!user) {
    return context.redirect("/auth/signin");
  }

  const kind = context.params.kind;
  if (!kind || !isDictionaryKind(kind)) {
    return context.redirect("/admin/dictionaries");
  }

  const form = await context.request.formData();
  const value = ((form.get("value") as string | null) ?? "").trim();

  const result = createDictionaryEntry(kind, value);
  if (!result.ok) {
    return redirectToWithError("/admin/dictionaries", result.error);
  }

  return context.redirect("/admin/dictionaries");
};
