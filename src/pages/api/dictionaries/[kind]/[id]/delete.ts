import type { APIRoute } from "astro";
import { deleteDictionaryEntry, isDictionaryKind } from "@/lib/dictionaries";

export const POST: APIRoute = async (context) => {
  const user = context.locals.user;
  if (!user) {
    return context.redirect("/auth/signin");
  }
  if (user.role !== "admin") {
    return new Response("Forbidden", { status: 403 });
  }

  const kind = context.params.kind;
  const id = Number(context.params.id);
  if (kind && isDictionaryKind(kind) && Number.isInteger(id)) {
    deleteDictionaryEntry(kind, id);
  }

  return context.redirect("/admin/dictionaries");
};
