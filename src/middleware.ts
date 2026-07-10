import { defineMiddleware } from "astro:middleware";
import { getSessionUser } from "@/lib/auth";

const PROTECTED_ROUTES = ["/dashboard"];

export const onRequest = defineMiddleware(async (context, next) => {
  context.locals.user = getSessionUser(context.cookies);

  if (PROTECTED_ROUTES.some((route) => context.url.pathname.startsWith(route))) {
    if (!context.locals.user) {
      return context.redirect("/auth/signin");
    }
  }

  return next();
});
