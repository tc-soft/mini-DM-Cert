import type { APIRoute } from "astro";
import { signOut } from "@/lib/auth";

export const POST: APIRoute = async (context) => {
  signOut(context.cookies);
  return context.redirect("/");
};
