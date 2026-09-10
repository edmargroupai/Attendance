# EdMar Attendance Register

Class attendance register app. Full product/technical spec:
[docs/EdMar_Attendance_Blueprint_and_Cursor_Build_Spec.md](docs/EdMar_Attendance_Blueprint_and_Cursor_Build_Spec.md).

## Status

**Stage 8 of 8 complete** (release preparation, per spec section 9).

Done:

- Next.js 16 (App Router) + TypeScript + Tailwind + ESLint scaffold, all
  dependency versions pinned.
- Repository structure matching the spec's suggested layout (route groups,
  `src/lib/*`, `supabase/*`, `tests/*`).
- Supabase project linked (`supabase/config.toml`); `.env.local` has
  working credentials (not committed).
- Full schema in `supabase/migrations/`: `teacher_settings`,
  `academic_years`, `terms`, `classes`, `students`, `enrolments`,
  `calendar_sessions`, `attendance_records`, `audit_events`,
  `command_receipts` — with composite-FK tenant isolation, RLS on every
  table, a generic audit trigger, and cross-table invariant triggers
  (term-in-academic-year, attendance/enrolment same-class).
- pgTAP owner-isolation and constraint tests in `supabase/tests/`.
- Real Supabase auth: sign in/up (`/login`), session middleware
  (`src/proxy.ts`), sign-out, auto-provisioned `teacher_settings` row.
- Calendar page (`/calendar`): create academic years and classes,
  deterministic open-session generation, closures with a marked-slot
  guard.
- Students page (`/students`): typed entry, paste-list and CSV import
  (validated, transactional via the `import_students` Postgres function),
  an alphabetically-grouped boys/girls roster filterable by an "as of"
  date so mid-month arrivals/withdrawals show correctly, and withdrawal.
- Attendance rule engine (`src/lib/attendance/rules.ts`,
  `summaries.ts`) — the single source of truth for attendance credit and
  daily/monthly summaries, unit tested (`npm run test`, vitest) against
  spec section 9's full hand-calculated fixture plus boundary cases.
- Register grid (`/register/[classId]`): the paper-style monthly
  register — merged day/date headers, sticky name/header columns,
  BOYS/GIRLS sections with live subtotals, keyboard-operable cells
  (arrows to navigate, P/A/L/E to set, Delete to clear, Enter/click for a
  menu), future-date and closed-session cells disabled, a "mark unmarked
  present" action with a preview/confirm step, and a saving/saved
  indicator.
- Atomic attendance persistence: `update_attendance_batch` (Postgres
  function, `POST /api/attendance`) applies up to 100 cell updates per
  call with compare-and-swap revisions, returns a structured 409 with
  authoritative values on conflict (never silently overwrites another
  tab), is idempotent on request-id retry via `command_receipts`, and
  leaves zero partial writes on any failure — verified directly against
  the linked project (create, idempotent retry, rejected payload
  mismatch, conflict, and a mixed valid+conflicting batch leaving both
  halves unapplied).
- Reports (`/reports`): boys/girls/combined monthly summary, per-student
  monthly summary, daily session summary, and a printable landscape
  register (repeated headers, segmented by week) — all built on the
  Stage-4 engine so they can't drift from the register grid. CSV export
  for all four report types (`src/lib/exports/`), with formula-injection
  neutralisation and correct quoting for user-entered text fields. Every
  report/export states school, class, period, generation time, rule
  version, and completion status.
- `.env.example` with the three required env vars.
- CI (`.github/workflows/ci.yml`): typecheck, lint, unit tests, and build
  on every push/PR to `main`. No secrets needed — pages are dynamic
  (rendered per-request), so the build doesn't touch a live Supabase
  project; the workflow uses harmless placeholder public values.
- Real browser E2E tests (Playwright, `npm run test:e2e`): a full sign-up
  → create class → add student → generate sessions → mark attendance →
  reload → reports walk, plus layout checks at 390px (mobile) and 1366px
  (desktop) per spec section 9's essential tests. These run against the
  live linked Supabase project and are **not** part of the CI gate (CI
  runners sharing IPs could trip Supabase's auth rate limit, and every
  run signs up a real throwaway account) — run manually before a release.
  Found and fixed two real bugs the unit/API-level testing in earlier
  stages couldn't see: an `event.currentTarget` null-after-`await` bug
  that silently broke three forms (the request succeeded but the UI
  never refreshed to show it), and the app header overflowing the
  viewport at 390px instead of wrapping.
- `supabase/seed.sql`: fictional demo data for local dev only
  (`supabase db reset`) — one demo teacher, a class, and four students.
  Its logic (including the `import_students` role/JWT-claim setup) was
  verified against the live project and then deleted from it; never run
  seed.sql against a real project.

Everything from the spec's 8-stage build sequence is done. What's
outside that sequence and still worth knowing:

- The Reports page's on-screen rendering was verified via unit tests
  reproducing spec section 9's fixture through the same export builders
  and the identical SSR data-fetching pattern proven end-to-end in
  Stages 3/5/6, plus the Stage-8 Playwright suite now exercises it
  directly in a real browser too.
- No local Docker-based Supabase dev stack was available in the session
  that built this (Docker Desktop wouldn't start) — all database work
  was verified directly against the linked dev project instead, inside
  transactions that were rolled back or explicitly cleaned up afterward.
  `supabase db reset`/`supabase test db` (pgTAP) have not been run
  locally; worth doing once Docker is available.

## Setup

```bash
npm install
cp .env.example .env.local   # then fill in real Supabase values
npm run dev
```

## Scripts

- `npm run dev` — start the dev server
- `npm run build` — production build
- `npm run typecheck` — `tsc --noEmit`
- `npm run lint` — ESLint
- `npm run test` — vitest (attendance rule engine unit tests)
- `npm run test:e2e` — Playwright, against a running dev server and the
  live Supabase project in `.env.local` (manual/local only, see above)
- `npm run test:e2e:cleanup` — deletes every `e2e-*@example.com` test
  account the E2E suite created

## Environment variables

See `.env.example`. `NEXT_PUBLIC_SUPABASE_URL` and
`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` come from a Supabase project
(Project Settings -> API). Never put a Supabase service-role key in this
app's browser-reachable code or env vars.

## Deployment (Vercel)

The spec's stack is Vercel for the app, Supabase for auth/database.

1. Import this GitHub repo into Vercel (a Next.js project is
   auto-detected — no build config needed).
2. Set these environment variables in the Vercel project (Settings ->
   Environment Variables), separately per environment (Preview vs
   Production) if you use different Supabase projects for each — spec
   section 10: "Separate development/preview data from production
   student data":
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
   - `NEXT_PUBLIC_APP_URL` — the exact deployed URL for that environment
3. In Supabase (Authentication -> URL Configuration), add that same URL
   to Site URL / Redirect URLs for auth to work there — this project's
   `supabase/config.toml` only configures `localhost:3000`;
   `supabase config push` would overwrite whatever's set for a
   deployed URL with local dev's, so **set the deployed URL directly in
   the Supabase dashboard**, not via `config push`, once one exists.
4. Deploy. Vercel builds and redeploys automatically on push to `main`
   (Production) and on every PR (Preview) once connected.

No production deployment has been done from this session — only local
dev and the linked Supabase dev project have been exercised.

## Database migrations

- Migrations live in `supabase/migrations/`, applied in filename
  (timestamp) order. Never edit a migration that's already been applied
  anywhere — add a new one.
- Apply to the linked project: `supabase link --project-ref <ref>` (once
  per machine), then `supabase db push --linked`. This project's
  Supabase CLI session is already linked to the dev project used
  throughout this build.
- Test locally first when possible: `supabase start` then
  `supabase db reset` (applies every migration + `seed.sql` fresh) —
  requires Docker; this wasn't available in the session that built this,
  so migrations were pushed straight to the (fresh, dev-only) linked
  project and verified there instead. Do this locally before applying to
  a shared/production target in the future.
- Before applying to a **production** target specifically: identify the
  exact target project ref and the exact migration file(s) being added,
  run `supabase db push --dry-run` first (or `supabase db diff` against
  it) as a preflight check, and confirm you have a way to restore before
  proceeding (see Backups below). Never `supabase db reset` a production
  project — that wipes it.

## Backups

Not verified in this build — I have not confirmed what backup/restore
capability the current Supabase plan on this project actually provides
(this depends on the plan tier and is configured in the Supabase
dashboard, not from this repo). Per spec section 10 ("do not assert a
backup policy exists without verifying it"), check
Supabase project Settings -> Backups before relying on it, and document
the actual restore procedure once verified — don't assume Point-in-Time
Recovery or daily backups are enabled.

## Handover checklist (spec section 10)

- [x] Working source + lockfile (`package-lock.json`, pinned versions)
- [x] Migrations + RLS (`supabase/migrations/`)
- [x] Generated database types (`src/lib/supabase/database.types.ts`)
- [x] Rule tests (`tests/unit/`, vitest)
- [x] Owner-isolation tests (`supabase/tests/`, pgTAP)
- [x] Browser tests (`tests/e2e/`, Playwright)
- [x] Fictional seed data (`supabase/seed.sql`)
- [x] Env template without secrets (`.env.example`)
- [x] README setup commands
- [x] Deployment/migration instructions (above)
- [x] Test report with remaining limitations (this file's Status
      section, and this checklist's caveats below)

Remaining limitations, stated plainly:
- No production deployment exists yet (see Deployment above).
- Backup/restore capability is unverified (see Backups above).
- `supabase db reset`/local pgTAP (`supabase test db`) haven't been run
  — Docker wasn't available in the building session; all schema/RLS/
  command-function testing was done directly against the linked dev
  project instead (see `supabase/tests/`, and the gate verifications
  described in each stage's git commit).
- E2E tests are real and passing but run manually, not in CI (see CI
  note above for why).
