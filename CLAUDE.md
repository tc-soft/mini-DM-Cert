# Rules for AI

This file provides guidance to AI agents when working with code in this repository.

## Commands

- `npm run dev` — start dev server
- `npm run build` — production build (SSR via `@astrojs/node`)
- `npm run preview` — preview production build
- `npm run lint` / `npm run lint:fix` — ESLint
- `npm run format` — Prettier (includes prettier-plugin-astro + prettier-plugin-tailwindcss)
- `npm run docs:pdf` — build the schema reference PDF (`scripts/build-schema-pdf.mjs`)

Pre-commit hooks: husky + lint-staged runs `eslint --fix` on `*.{ts,tsx,astro}` and `prettier --write` on `*.{json,css,md}`.

## Architecture

**Astro 6 SSR app** ("mini-DM" — purchase order tracking) with React 19 islands, Tailwind 4, and a local SQLite database via `better-sqlite3`. Deployed as a standalone Node server (`@astrojs/node`, `mode: "standalone"`), typically behind a TLS-terminating reverse proxy.

### Rendering mode

Full server-side rendering (`output: "server"` in `astro.config.mjs`). API routes must export `const prerender = false`.

### Auth flow

Cookie-based sessions, not a third-party auth provider:

- `src/lib/db.ts` — opens the SQLite database, creates tables (`users`, `sessions`, `products`, `suppliers`, `currencies`, `purchase_orders`, `purchase_order_history`) if missing, seeds a default admin (`ADMIN_USERNAME`/`ADMIN_PASSWORD` env vars, or a random password logged once on first boot).
- `src/lib/auth.ts` — `signIn`/`getSessionUser`/`signOut`, scrypt password hashing, opaque random session tokens stored in the `sessions` table.
- `src/middleware.ts` — runs on every request, resolves `context.locals.user` from the session cookie, redirects unauthenticated users away from `PROTECTED_ROUTES` (`/dashboard`, `/orders`, `/reports`, `/admin`, `/api/orders`, `/api/dictionaries`, `/api/users`).
- API endpoints: `src/pages/api/auth/{signin,signout}.ts`

### Schema migrations

`CREATE TABLE IF NOT EXISTS` in `src/lib/db.ts` only handles brand-new databases — it's a no-op on a database that already has the table. Column/constraint changes to existing tables go through versioned migrations in `src/lib/migrations.ts` (`runMigrations(db)`), not ad-hoc `ALTER TABLE` patches scattered around.

### Key conventions

- **Path alias**: `@/*` maps to `./src/*` (tsconfig paths).
- **Astro components** for static content/layout; **React components** only when interactivity is needed.
- **Tailwind class merging**: use the `cn()` helper from `@/lib/utils` (clsx + tailwind-merge) for conditional/merged class names.
- **UI components**: `src/components/ui/` (shadcn-style primitives), feature components under `src/components/{auth,orders}/`.
- **API routes**: uppercase `GET`/`POST` exports.
- **Services/helpers**: `src/lib/` (e.g. `orders.ts`, `orders-form.ts`, `dictionaries.ts`, `money.ts`, `users.ts`, `http.ts`).
- **Money values**: stored as integers (minor units); see `src/lib/money.ts` for formatting/parsing helpers — don't do float arithmetic on prices.

### Environment

- Node.js v22.14.0 (see `.nvmrc`)
- Env vars (see `.env.example`): `DATABASE_PATH`, `ADMIN_USERNAME`, `ADMIN_PASSWORD` — all optional, declared as server-only secrets in `astro.config.mjs` `env.schema`.
- Local SQLite file lives under `data/` (gitignored); deleting it resets the database (a fresh admin account will be reseeded on next boot).

### Security notes

- `astro.config.mjs` sets `security.allowedDomains: [{}]` deliberately — this app is meant to run behind a reverse proxy that terminates TLS and sets `Host`/`X-Forwarded-Proto`, so Astro's origin check is relaxed to trust the proxy rather than a fixed hostname. This assumes the proxy is the *only* network path to the container; don't remove the comment explaining that constraint if you touch this config.

## CI

GitHub Actions workflow (`.github/workflows/ci.yml`) runs `astro sync`, lint, and build on every push/PR to `master`.
