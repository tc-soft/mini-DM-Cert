import type { APIRoute } from "astro";
import {
  dictionaryPagePath,
  dictionaryRequiresAdmin,
  isDictionaryKind,
  updateDictionaryEntry,
} from "@/lib/dictionaries";
import { redirectToWithError } from "@/lib/orders-form";

export const POST: APIRoute = async (context) => {
  const user = context.locals.user;
  if (!user) {
    return context.redirect("/auth/signin");
  }

  const kind = context.params.kind;
  const id = Number(context.params.id);
  if (!kind || !isDictionaryKind(kind) || !Number.isInteger(id)) {
    return context.redirect("/admin/dictionaries");
  }
  if (dictionaryRequiresAdmin(kind) && user.role !== "admin") {
    return new Response("Forbidden", { status: 403 });
  }

  const form = await context.request.formData();
  const value = ((form.get("value") as string | null) ?? "").trim();

  const result = updateDictionaryEntry(kind, id, value);
  if (!result.ok) {
    return redirectToWithError(dictionaryPagePath(kind), result.error);
  }

  return context.redirect(dictionaryPagePath(kind));
};
