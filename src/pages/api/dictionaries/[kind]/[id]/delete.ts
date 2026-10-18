import type { APIRoute } from "astro";
import {
  deleteDictionaryEntry,
  dictionaryPagePath,
  dictionaryRequiresAdmin,
  isDictionaryKind,
} from "@/lib/dictionaries";

export const POST: APIRoute = (context) => {
  const user = context.locals.user;
  if (!user) {
    return context.redirect("/auth/signin");
  }

  const kind = context.params.kind;
  const id = Number(context.params.id);
  if (!kind || !isDictionaryKind(kind)) {
    return context.redirect("/admin/dictionaries");
  }
  if (dictionaryRequiresAdmin(kind) && user.role !== "admin") {
    return new Response("Forbidden", { status: 403 });
  }

  if (Number.isInteger(id)) {
    deleteDictionaryEntry(kind, id);
  }

  return context.redirect(dictionaryPagePath(kind));
};
