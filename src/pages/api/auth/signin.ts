import type { APIRoute } from "astro";
import { signIn, setSessionCookie } from "@/lib/auth";

export const POST: APIRoute = async (context) => {
  const form = await context.request.formData();
  const username = (form.get("username") as string | null)?.trim() ?? "";
  const password = (form.get("password") as string | null) ?? "";

  const session = signIn(username, password);
  if (!session) {
    return context.redirect(`/auth/signin?error=${encodeURIComponent("Invalid username or password")}`);
  }

  setSessionCookie(context.cookies, session.token, import.meta.env.PROD);
  return context.redirect("/");
};
