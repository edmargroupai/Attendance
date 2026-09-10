# EdMar Attendance Register

Class attendance register app. Full product/technical spec:
[docs/EdMar_Attendance_Blueprint_and_Cursor_Build_Spec.md](docs/EdMar_Attendance_Blueprint_and_Cursor_Build_Spec.md).

## Status

**Stage 2 of 8 complete** (database schema/RLS, per spec section 9).

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
- Login page shell (`/login`) — UI only, form is disabled/not wired up.
- `.env.example` with the three required env vars.

Not yet done (stages 3-8): no application code queries these tables yet,
the attendance rule engine and register grid are unimplemented stubs,
there is no CSV import, no reports/export, no atomic batch-command
endpoints, no CI, and this has not been deployed anywhere.

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

## Environment variables

See `.env.example`. `NEXT_PUBLIC_SUPABASE_URL` and
`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` come from a Supabase project
(Project Settings -> API). Never put a Supabase service-role key in this
app's browser-reachable code or env vars.
