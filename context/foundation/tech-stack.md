---
starter_id: 10x-astro-starter
package_manager: npm
project_name: mini-dm
hints:
  language_family: js
  team_size: solo
  deployment_target: self-host
  ci_provider: github-actions
  ci_default_flow: auto-deploy-on-merge
  bootstrapper_confidence: first-class
  path_taken: custom
  quality_override: false
  self_check_answers:
    typed: true
    from_official_starter: true
    conventions: true
    docs_current: true
    can_judge_agent: false
  has_auth: true
  has_payments: false
  has_realtime: true
  has_ai: false
  has_background_jobs: false
---

## Why this stack

Solo developer building an internal purchase-planning web app (mini-DM) in 3 weeks, after-hours only, deployed exclusively on the company's internal network with no public internet access. Astro + React + TypeScript is the recommended default for `(web-app, js)` and clears all four agent-friendly gates. The stock 10x-astro-starter card ships Supabase + Cloudflare, but both are cloud services incompatible with the internal-only deployment constraint from the PRD's non-functional requirements, so this hand-off keeps Astro's own API routes (no separate Express/Fastify service) for the backend, SQLite as the database (native Node support, single file, fits a self-hosted single process), and a seeded default admin account with salted password hashes at first boot instead of Supabase Auth. Express was considered for the API layer but rejected: it fails the typed and convention-based quality gates, and a single Astro process is simpler to run and deploy than two Node services on one internal server. `has_auth` and `has_realtime` (live view updates across concurrent users editing the same data) are set; payments, AI, and background jobs are out of scope per PRD non-goals. Deployment targets self-host via Astro's Node adapter; CI runs on GitHub Actions with auto-deploy-on-merge.

**2026-08-30 addition:** automated testing was added on top of this stack — Vitest for unit/integration tests against `src/lib/` (using `getViteConfig` for Astro compatibility, with an isolated temp SQLite database per test file) and Playwright for E2E tests driving the real dev server. Both run in CI alongside lint/build. See `CLAUDE.md`'s Testing section for the operational details and gotchas (React-island hydration timing, `astro:env/server` caching).
