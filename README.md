# EdMar Attendance Register

Class attendance register app. Full product/technical spec:
[docs/EdMar_Attendance_Blueprint_and_Cursor_Build_Spec.md](docs/EdMar_Attendance_Blueprint_and_Cursor_Build_Spec.md).

## Status

**Stage 1 of 8 complete** (repository scaffold, per spec section 9).

Done:

- Next.js 16 (App Router) + TypeScript + Tailwind + ESLint scaffold, all
  dependency versions pinned.
- Repository structure matching the spec's suggested layout (route groups,
  `src/lib/*`, `supabase/*`, `tests/*`).
- Supabase client helpers (`src/lib/supabase/*`) written against
  `@supabase/ssr`, not yet connected to a live project.
- Login page shell (`/login`) — UI only, form is disabled/not wired up.
- `.env.example` with the three required env vars.

Not yet done (stages 2-8): no Supabase project is connected, no database
migrations/RLS exist, the attendance rule engine and register grid are
unimplemented stubs, there is no CSV import, no reports/export, no tests,
no CI, and this has not been deployed anywhere.

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
