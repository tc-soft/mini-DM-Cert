---
project: mini-dm
checked_at: 2026-10-23T18:20:03Z
health_status: needs-attention
context_type: brownfield
language_family: js
stack_assessment_available: false
checks_run:
  - lockfile
  - dependency_audit
  - outdated_deps
  - test_runner
  - ci_cd
  - configuration
audit_findings:
  critical: 0
  high: 4
  moderate: 8
  low: 1
test_runner_detected: true
ci_provider: GitHub Actions
recommended_fixes: 5
---

## Dependency Health

### Lockfile

```
Status: present (package-lock.json)
Package manager: npm
```

### Security Audit

```
Tool: npm audit --json
Summary: 0 CRITICAL, 4 HIGH, 8 MODERATE, 1 LOW
Direct vs transitive: 1 direct (vitest, MODERATE), 12 transitive
```

#### HIGH findings

- **brace-expansion** (transitive, via eslint toolchain) — multiple DoS advisories (GHSA-3jxr-9vmj-r5cp, GHSA-mh99-v99m-4gvg, GHSA-rgw5-rvv9-x895, GHSA-qhr7-859c-m2p7, GHSA-6j4f-fj2g-mc7p): exponential/unbounded expansion causing CPU or memory exhaustion. Fix available.
- **browserslist** (transitive, via Tailwind/PostCSS) — GHSA-c83g-rgw3-j3cx (unbounded memory growth) and GHSA-73wf-gq98-2v4g (crash via untrusted stats file). Fix available.
- **fast-uri** (transitive, via ajv/astro tooling) — 7 advisories covering host confusion, SSRF via malformed IPv6/hostname normalization, and authority injection. Fix available.
- **js-yaml** (transitive, via astro-language-server) — quadratic-CPU DoS advisories (GHSA-52cp-r559-cp3m, GHSA-5p4m-2wfm-xmqj, GHSA-2883-xcg3-v3hh). Fix available.

All four HIGH findings are build/tooling-time transitive dependencies (eslint, Tailwind, astro-language-server, ajv) — not runtime dependencies of the deployed server — which caps real-world exploitability, but they still inflate `npm audit`'s signal-to-noise and are worth clearing.

MODERATE (8) and LOW (1) findings are all transitive except **vitest** (direct, MODERATE — GHSA-qxg6-89mg-rqv8, code injection via unauthenticated manual mock registration in `@vitest/mocker`, fixed in a patch release).

### Outdated Dependencies

```
Packages with major version gaps: 2
```

- **eslint-plugin-astro**: 1.7.0 → 3.2.1 (2 major versions behind)
- **typescript**: 5.9.3 → 7.0.2 (skips a major entirely; verify this isn't a premature/non-LTS release before bumping)

Everything else outdated (astro, eslint, prettier, playwright, react, tailwindcss, etc.) is a minor/patch gap and not flagged individually.

## Test Suite

```
Test runner: Vitest (unit/integration) + Playwright (E2E)
Tests found: 71 unit/integration tests across 7 files; 5 E2E tests across 4 spec files
Test execution: passing (Vitest: 71/71 passed in 4.3s; Playwright: all 5 discovered via `--list`, not re-run live in this check)
```

```
Configuration: vitest.config.ts, playwright.config.ts
Framework: Vitest v4.1.11, Playwright v1.62.1
```

Both suites are well-structured per `CLAUDE.md`'s documented DB-isolation strategy (per-file temp SQLite DB via a mocked `astro:env/server`) — a non-obvious setup that's already correctly guarded against regression.

## CI/CD

```
Provider: GitHub Actions
Configuration: .github/workflows/ci.yml
```

| Stage      | Status | Notes                                              |
|------------|--------|-----------------------------------------------------|
| Lint       | ✓      | `npm run lint` (ESLint)                              |
| Test       | ✓      | `npm run test` (Vitest) + `npm run test:e2e` (Playwright) |
| Build      | ✓      | `npm run build` (astro build)                        |
| Type check | ✗      | not configured — see Configuration below             |
| Security   | ✗      | `npm audit` not run in CI                            |

## Configuration

### Medium severity

- **No dedicated type-check step** — `tsconfig.json` extends `astro/tsconfigs/strict`, and `@astrojs/check` is already a listed dependency, but no `package.json` script or CI step ever invokes it (CI only runs `astro sync`, which generates types but doesn't validate them). ESLint's type-aware rules give partial coverage, but a `.astro` template type error or a `tsc`-only class of bug can currently reach `main` unexamined. Fix: add `"check": "astro check"` to `package.json` scripts and a `- run: npm run check` step in `.github/workflows/ci.yml` (after `astro sync`, before `build`).
- **No security scanning in CI** — `npm audit` findings (above) aren't checked automatically; regressions would only surface if someone runs the audit locally. Fix: add `- run: npm audit --audit-level=high` as a CI step (non-blocking at first, via `|| true`, if you don't want it gating merges yet).

### Low severity

- **.editorconfig** — not present. Harmless given Prettier is already configured and enforced via lint-staged, but editors without a Prettier plugin active will drift on indentation/line-endings. Fix: add a minimal `.editorconfig` matching Prettier's settings (2-space indent, LF, UTF-8, trim trailing whitespace).

No other configuration gaps — `.gitignore`, `.env.example`, `CLAUDE.md`, `.prettierrc.json`, and `eslint.config.js` are all present and in good shape.

## Stack Assessment Cross-Reference

No stack-assessment.md found. Run `/10x-stack-assess` for quality-gate analysis.

## Recommended Fixes

### Fix before agent work (Category A)

### 1. Clear the HIGH-severity npm audit findings

**Impact**: Four HIGH-severity transitive advisories (brace-expansion, browserslist, fast-uri, js-yaml) are all DoS-class and fix-available; leaving them creates noise that will mask a future genuinely urgent finding, and an agent asked to "fix the audit" has no signal to prioritize without this triage already done.
**Severity**: high
**Effort**: quick (< 5 min)
**Fix**:

```bash
npm audit fix
npm run lint && npm run test
```

Re-run `npm audit --json` afterward to confirm the HIGH count drops to 0; none of the four are marked as requiring `--force` (no breaking major bumps needed).

### 2. Patch the vitest/@vitest-mocker code-injection advisory

**Impact**: This is the one *direct* dependency finding (MODERATE) — `@vitest/mocker`'s manual mock registration is exploitable without authentication. It's test-only code, not shipped to production, but it still runs against your real dev machine during `npm run test`.
**Severity**: moderate
**Effort**: quick (< 5 min)
**Fix**: Covered by the same `npm audit fix` in item 1 (fix target is `vitest@4.1.12`, a patch release — no breaking change).

### 3. Wire up `astro check` as a dedicated type-check step

**Impact**: Agent-written code relies on `tsconfig.json`'s strict mode to catch mistakes, but nothing in CI currently runs a project-wide type check — `astro build` and ESLint's type-aware rules give partial, not complete, coverage, especially inside `.astro` files. Without this, a plausible-looking agent change can pass CI with a type error that only surfaces at runtime.
**Severity**: medium
**Effort**: quick (< 5 min)
**Fix**:

```bash
# package.json
"check": "astro check"
```

```yaml
# .github/workflows/ci.yml, after "npx astro sync"
- run: npm run check
```

### 4. Review the eslint-plugin-astro and typescript major version gaps

**Impact**: `eslint-plugin-astro` is 2 majors behind (1.7.0 → 3.2.1) and `typescript` is 2 majors behind with a skipped major (5.9.3 → 7.0.2) — both affect lint/type-check behavior that agent-written code is validated against. Bumping blind risks new rule violations or breaking changes; not bumping risks drifting further from upstream fixes (including the eslint 10 / typescript-eslint 8.72 line already a minor behind).
**Severity**: medium
**Effort**: moderate (15–30 min)
**Fix**: Check each package's changelog for breaking changes, bump one at a time, re-run `npm run lint` and `npm run test` after each to isolate any regression.

### 5. Add `.editorconfig`

**Impact**: Low-stakes, but keeps formatting consistent for any editor/contributor that doesn't pick up the Prettier config automatically.
**Severity**: low
**Effort**: quick (< 5 min)
**Fix**: Add a 2-space, LF, UTF-8, trim-trailing-whitespace `.editorconfig` matching the existing `.prettierrc.json` settings.

### Addressed in upcoming lessons (Category B)

No outstanding Category B gaps. CI/CD is already configured (GitHub Actions, `.github/workflows/ci.yml`) and an agent instruction file is already present (`CLAUDE.md`) — both of the items this check would otherwise defer to later lessons are already in place.

## Summary

Health status: needs-attention

The project has a strong operational foundation: a working lockfile, a full and correctly-isolated Vitest + Playwright test suite (71 unit tests, 5 E2E tests, all passing/discoverable), and a CI pipeline that already runs lint, build, and both test layers. The gaps are narrow and fixable in well under an hour combined — four HIGH (but tooling-only, fix-available) npm audit findings, a missing dedicated type-check step despite strict TypeScript already being configured, and two dependencies that are two majors behind. None of these indicate agent-readiness risk on their own; they're the kind of thing worth clearing in one pass before the next round of agent-assisted feature work.

Next step: run `npm audit fix` and wire up `npm run check` in CI (items 1–3 above, ~10 minutes combined), then proceed with agent-assisted development as planned.
