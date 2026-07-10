---
bootstrapped_at: 2026-07-10T17:21:41Z
starter_id: 10x-astro-starter
starter_name: 10x Astro Starter (Astro + Supabase + Cloudflare)
project_name: mini-dm
language_family: js
package_manager: npm
cwd_strategy: git-clone
bootstrapper_confidence: first-class
phase_3_status: ok
audit_command: npm audit --json
---

## Hand-off

```yaml
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
```

### Why this stack

Solo developer building an internal purchase-planning web app (mini-DM) in 3 weeks, after-hours only, deployed exclusively on the company's internal network with no public internet access. Astro + React + TypeScript is the recommended default for `(web-app, js)` and clears all four agent-friendly gates. The stock 10x-astro-starter card ships Supabase + Cloudflare, but both are cloud services incompatible with the internal-only deployment constraint from the PRD's non-functional requirements, so this hand-off keeps Astro's own API routes (no separate Express/Fastify service) for the backend, SQLite as the database (native Node support, single file, fits a self-hosted single process), and a seeded default admin account with salted password hashes at first boot instead of Supabase Auth. Express was considered for the API layer but rejected: it fails the typed and convention-based quality gates, and a single Astro process is simpler to run and deploy than two Node services on one internal server. `has_auth` and `has_realtime` (live view updates across concurrent users editing the same data) are set; payments, AI, and background jobs are out of scope per PRD non-goals. Deployment targets self-host via Astro's Node adapter; CI runs on GitHub Actions with auto-deploy-on-merge.

## Pre-scaffold verification

| Signal      | Value                                                    | Severity  | Notes                                                            |
| ----------- | --------------------------------------------------------- | --------- | ------------------------------------------------------------------ |
| npm package | not run                                                    | n/a       | `cmd_template` starts with `git clone`, not an npm `create-*` CLI |
| GitHub repo | not run                                                    | n/a       | `gh` CLI unavailable in this environment (command not found); recency check skipped, WARN-AND-CONTINUE per protocol |

## Scaffold log

**Resolved invocation**: `git clone https://github.com/przeprogramowani/10x-astro-starter .bootstrap-scaffold && cd .bootstrap-scaffold && npm install`
**Strategy**: git-clone
**Exit code**: 0
**Files moved**: 19 top-level entries (`.env.example`, `.github`, `.gitignore`, `.husky`, `.nvmrc`, `.prettierrc.json`, `.vscode`, `README.md`, `astro.config.mjs`, `components.json`, `eslint.config.js`, `node_modules`, `package-lock.json`, `package.json`, `public`, `src`, `supabase`, `tsconfig.json`, `wrangler.jsonc`)
**Conflicts (.scaffold siblings)**: `CLAUDE.md` (existing project `CLAUDE.md` kept; scaffold copy landed at `CLAUDE.md.scaffold`)
**.gitignore handling**: moved silently (absent in cwd before scaffold)
**.bootstrap-scaffold cleanup**: deleted (cloned `.git/` was removed before move-up so the starter's upstream history does not leak into this project)

Notes: `mv` failed on `node_modules` with a Windows permission error (likely a locked handle from a postinstall script); recovered by `cp -r` followed by `rm -rf` of the source instead of a rename. Verified matching entry counts (587/587) between scaffold and cwd `node_modules` before deleting the source.

## Post-scaffold audit

**Tool**: npm audit --json
**Summary**: 0 CRITICAL, 6 HIGH, 9 MODERATE, 2 LOW
**Direct vs transitive**: 0/1/2/0 direct of total 0/6/9/2 (per `metadata.dependencies` + each advisory's `isDirect` flag)

#### CRITICAL findings

None.

#### HIGH findings

- **astro** (direct) — via: "Astro: Reflected XSS via unescaped slot name" (GHSA-8hv8-536x-4wqp), "Astro: Host header SSRF in prerendered error page fetch" (GHSA-2pvr-wf23-7pc7). Fix available.
- **devalue** (transitive, via svelte tooling) — "Svelte devalue: DoS via sparse array deserialization" (GHSA-77vg-94rm-hx3p). Fix available.
- **miniflare** (transitive, via undici/ws) — no single advisory ID; inherits undici/ws HIGH findings below. Fix available.
- **undici** (transitive) — "TLS certificate validation bypass via dropped requestTls in SOCKS5 ProxyAgent" (GHSA-vmh5-mc38-953g), "WebSocket client DoS via fragment count bypass" (GHSA-vxpw-j846-p89q), "cross-origin request routing via SOCKS5 proxy pool reuse" (GHSA-hm92-r4w5-c3mj). Fix available.
- **vite** (transitive) — "`server.fs.deny` bypass on Windows alternate paths" (GHSA-fx2h-pf6j-xcff). Fix available.
- **ws** (transitive) — "Memory exhaustion DoS from tiny fragments and data chunks" (GHSA-96hv-2xvq-fx4p). Fix available.

#### MODERATE findings

- **@astrojs/language-server** (transitive, via volar-service-yaml). Fix available.
- **@cloudflare/vite-plugin** (transitive, via miniflare/wrangler/ws). Fix available.
- **js-yaml** (transitive) — "Quadratic-complexity DoS in merge key handling via repeated aliases" (GHSA-h67p-54hq-rp68). Fix available.
- **supabase** (direct) — via `tar`. Fix available.
- **tar** (transitive) — "PAX size override file-smuggling differential" (GHSA-vmf3-w455-68vh). Fix available.
- **volar-service-yaml** (transitive, via yaml-language-server). Fix available.
- **wrangler** (direct) — via esbuild/miniflare. Fix available.
- **yaml** (transitive) — "Stack Overflow via deeply nested YAML collections" (GHSA-48c2-rrv3-qjmp). Fix available.
- **yaml-language-server** (transitive, via yaml). Fix available.

#### LOW / INFO findings

- **@babel/core** (transitive) — "Arbitrary File Read via sourceMappingURL Comment" (GHSA-4x5r-pxfx-6jf8). Fix available.
- **esbuild** (transitive) — "arbitrary file read when running the dev server on Windows" (GHSA-g7r4-m6w7-qqqr). Fix available.

All 17 findings report `fixAvailable: true`. Bootstrapper does not run `npm audit fix` — this is informational; the user decides whether/when to patch.

## Hints recorded but not acted on

| Hint                    | Value          |
| ------------------------ | -------------- |
| bootstrapper_confidence | first-class    |
| quality_override        | false          |
| path_taken              | custom         |
| self_check_answers      | typed: true, from_official_starter: true, conventions: true, docs_current: true, can_judge_agent: false |
| team_size               | solo           |
| deployment_target       | self-host      |
| ci_provider             | github-actions |
| ci_default_flow         | auto-deploy-on-merge |
| has_auth                | true           |
| has_payments            | false          |
| has_realtime            | true           |
| has_ai                  | false          |
| has_background_jobs     | false          |

Note: the hand-off's `## Why this stack` paragraph documents an intent to replace Supabase + Cloudflare with SQLite + self-hosted Astro API routes. v1 does not act on that narrative — it scaffolds the stock 10x-astro-starter card as registered. Swapping the data/auth/deploy layer to match the internal-only constraint is a manual follow-up (see Next steps).

## Next steps

Next: a future skill will set up agent context (CLAUDE.md, AGENTS.md). For now, your project is scaffolded and verified — happy hacking.

Useful manual steps in the meantime:
- `git init` (if you have not already) to start your own repo history — the cloned starter's own git history was deliberately discarded.
- Review `CLAUDE.md.scaffold` against your existing `CLAUDE.md` and merge anything from the starter you want to keep.
- Per this hand-off's own rationale, the stock scaffold ships Supabase + Cloudflare; swap these for SQLite + Astro's Node adapter + a seeded local admin account to match the internal-only deployment constraint before writing any feature code.
- Address audit findings per your project's risk tolerance — 6 HIGH and 9 MODERATE findings above, all with fixes available (`npm audit fix` or manual bumps).
