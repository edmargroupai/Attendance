# EdMar Attendance Register

Class attendance register app. Full product/technical spec:
[docs/EdMar_Attendance_Blueprint_and_Cursor_Build_Spec.md](docs/EdMar_Attendance_Blueprint_and_Cursor_Build_Spec.md).

## Status

**Stage 7 of 8 complete** (summaries/exports, per spec section 9).

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

Not yet done (stage 8): no CI, mobile/desktop browser checks, or
deployment. Also note: the Reports page's on-screen rendering has been
verified via unit tests reproducing spec section 9's fixture through the
same export builders and the identical SSR data-fetching pattern already
proven end-to-end in Stages 3/5, but not interactively clicked through in
a real browser (no browser-automation tool available in this session) —
worth a manual look before relying on it.

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

## Environment variables

See `.env.example`. `NEXT_PUBLIC_SUPABASE_URL` and
`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` come from a Supabase project
(Project Settings -> API). Never put a Supabase service-role key in this
app's browser-reachable code or env vars.
