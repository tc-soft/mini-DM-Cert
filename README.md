# mini-DM

![](./public/template.png)

Internal purchase-planning web app. Solo developer, self-hosted on the company's internal network only — no public internet access.

## Tech Stack

- [Astro](https://astro.build/) v6 - Modern web framework with server-first rendering
- [React](https://react.dev/) v19 - UI library for interactive components
- [TypeScript](https://www.typescriptlang.org/) v5 - Type-safe JavaScript
- [Tailwind CSS](https://tailwindcss.com/) v4 - Utility-first CSS framework
- [better-sqlite3](https://github.com/WiseLibs/better-sqlite3) - Embedded SQLite database, single file, no external service
- [@astrojs/node](https://docs.astro.build/en/guides/integrations-guide/node/) - Self-hosted Node runtime, no cloud deployment dependency

## Prerequisites

- Node.js v22.14.0 (as specified in `.nvmrc`)
- npm (comes with Node.js)

## Getting Started

1. Install dependencies:

```bash
npm install
```

2. (Optional) Configure environment variables — see [Configuration](#configuration) below. Sane defaults apply if you skip this.

3. Run the development server:

```bash
npm run dev
```

On first boot, if the `users` table is empty, a default admin account is seeded automatically. If you did not set `ADMIN_PASSWORD`, the generated password is printed once to the server console — copy it before it scrolls away.

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Run the production build (`node ./dist/server/entry.mjs`)
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint with type-checked rules
- `npm run lint:fix` - Auto-fix ESLint issues
- `npm run format` - Run Prettier

## Project Structure

```md
.
├── src/
│ ├── layouts/ # Astro layouts
│ ├── pages/ # Astro pages
│ │ └── api/ # API endpoints
│ ├── components/ # UI components (Astro & React)
│ ├── lib/ # db.ts (SQLite), auth.ts (sessions)
│ └── assets/ # Static assets
├── public/ # Public assets
├── data/ # SQLite database file (gitignored, created on first run)
```

## Configuration

Environment variables are declared via Astro's `astro:env` schema and are treated as **server-only secrets** — they are never exposed to the client. All are optional.

| Variable         | Description                                                                    | Default                |
| ----------------- | -------------------------------------------------------------------------------- | ----------------------- |
| `DATABASE_PATH`  | Path to the SQLite database file                                               | `./data/mini-dm.db`    |
| `ADMIN_USERNAME` | Username for the seeded default admin account                                  | `admin`                |
| `ADMIN_PASSWORD` | Password for the seeded default admin account                                  | randomly generated     |

Copy `.env.example` to `.env` to set these locally:

```bash
cp .env.example .env
```

### Auth routes

| Route          | Description                                                             |
| --------------- | ------------------------------------------------------------------------- |
| `/auth/signin` | Username/password sign-in form                                          |
| `/dashboard`   | Example protected page (redirects to `/auth/signin` if unauthenticated) |

There is no public sign-up route. Accounts are local (username + salted password hash, stored in SQLite) and — per the product's access-control model — created by an Administrator, not self-registered. Account management UI is a planned feature, not yet built.

Route protection is handled in `src/middleware.ts`. Add paths to the `PROTECTED_ROUTES` array there to require authentication.

## Deployment

This project is self-hosted on the internal network via Astro's Node adapter (`mode: "standalone"`), which produces a runnable Node server.

1. Build the project:

```bash
npm run build
```

2. Run it:

```bash
npm run start
```

Set `DATABASE_PATH` to a persistent location outside the deployment directory so the database survives redeploys. Set `ADMIN_USERNAME` / `ADMIN_PASSWORD` if you want to pin the seeded admin credentials instead of relying on the random-password-on-first-boot behavior.

## CI

GitHub Actions runs lint + build on every push and PR to `master`. No secrets are required for the build step — SQLite needs no external service.

## License

MIT
