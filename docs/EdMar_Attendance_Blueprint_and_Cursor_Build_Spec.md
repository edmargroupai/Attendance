# EdMar Attendance Register
## Product blueprint and Cursor / Claude build specification

Version 1.0 · 10 September 2026 · Prepared for Kemar Edwards

This is an implementation handover, not a claim that an application has been built or tested. Sections labelled defaults resolve details not yet specified by the owner; they are implementation choices rather than previously approved requirements.

## 1. Goal and scope

Build a dependable digital class attendance register that resembles the owner's paper-register reference. The register is the main screen. Every teaching date has two columns: 1 = morning; 2 = afternoon. Teachers enter students, mark attendance and receive accurate daily and monthly counts without manual arithmetic.

Confirmed requirements:

- Separate BOYS and GIRLS sections, each in alphabetical order.
- Day letters spanning two session columns, exactly like the supplied M / T reference, with 1 and 2 beneath each day.
- P = Present, A = Absent, L = Late, Ex = Excused.
- Morning attendance counts P only. Late attendance contributes to afternoon numbers, never morning numbers.
- Daily boys', girls' and combined figures for each session; monthly session totals.
- No AI dependency. Manual student entry is the baseline.

Version 1 includes typed entry, pasted lists and CSV import. Excel users can save as CSV. Native XLSX import and image/OCR import are deferred. Do not add AI SDKs, API keys, chatbot interfaces, image extraction, marks/grades, payment systems, parent messaging, RenWeb sync, biometrics or lesson planning.

Defaults: one teacher-owned workspace may contain multiple classes; each teacher sees only their classes. Store a school name as metadata. Shared-school administration and co-teaching are future features, not implied permissions. Use British English and America/Jamaica as the configurable initial timezone. Default weekdays are Monday–Friday; Saturday can be enabled. Default alphabetical order is surname, given names, stable student ID.

## 2. Exact attendance semantics — authoritative

Store the two session marks independently. The initial interpretation of the owner's rule is: morning P counts 1; afternoon P or L counts 1. A morning L records lateness but does not generate an afternoon mark. The teacher must record afternoon attendance independently. This avoids counting a late student who left before the afternoon. Show this rule in Settings and in the register help text; if the owner later requests automatic carry-forward, revise the rule and fixtures explicitly rather than silently introducing it.

| Stored mark | Morning attendance credit | Afternoon attendance credit |
|---|---:|---:|
| P | 1 | 1 |
| L | 0 | 1 |
| A | 0 | 0 |
| Ex | 0 | 0 |
| Blank / null | 0; incomplete | 0; incomplete |

A mark applies only to its own column. An L in morning plus a P in afternoon is one attended session, not two. An L in both columns is one attended session and two session-level late marks. Label late totals as “Late marks” to avoid implying unique late students. Do not relabel morning L as A merely because it contributes zero attendance credit.

```ts
type Mark = 'P' | 'A' | 'L' | 'Ex' | null;
type Session = 1 | 2;
function attendanceCredit(session: Session, mark: Mark): 0 | 1 {
  return mark === 'P' || (session === 2 && mark === 'L') ? 1 : 0;
}
```

Call this function only for eligible students on scheduled open sessions. Keep this rule in one tested domain module; all UI totals, reports and exports must use it. Reject any other status or session value at runtime and in the database.

### Required examples

| Morning | Afternoon | Morning total | Afternoon total | Daily session total |
|---|---|---:|---:|---:|
| P | P | 1 | 1 | 2 |
| L | P | 0 | 1 | 1 |
| P | L | 1 | 1 | 2 |
| L | L | 0 | 1 | 1 |
| L | A | 0 | 0 | 0 |
| L | blank | 0 | 0 | 0; incomplete |
| A | P | 0 | 1 | 1 |
| Ex | P | 0 | 1 | 1 |
| A | Ex | 0 | 0 | 0 |

### Daily and monthly definitions

For each date/session, show P, L, A, Ex and Unmarked counts for boys, girls and combined, plus Attendance total. Count only enrolments active on that date. Enrolment start and end dates are inclusive.

- Scheduled class sessions = number of open session slots in the selected month. Twenty full days means 40; a half-day contributes one.
- Student possible sessions = open slots during that student's effective enrolment period.
- Student attended sessions = sum of attendance credit over eligible recorded slots.
- Class attended student-sessions = sum of all students' credits. This is different from scheduled class sessions.
- Monthly boys/girls totals = sums of the respective session credits, also split into morning and afternoon.
- Combined totals must equal boys plus girls.
- Status totals show counts of original marks, not attendance credits.
- Completion = marked eligible slots / possible student-slots. If the denominator is zero, display N/A.
- Optional displayed attendance percentage = attended / possible × 100, labelled provisional until all eligible slots are marked. Do not remove Ex from the denominator in version 1. Explain that this is the app's defined calculation, not a claim of an official Ministry reporting formula.

Never label blank as absent. Label partial-month figures provisional and show Unmarked. Use integer counts internally, rounding only percentages to one decimal. For current-month progress provide a separately labelled “through today” summary; the full-month denominator includes future scheduled sessions. Future cells are disabled.

## 3. Main interface blueprint

Initial signed-in route opens the last selected class/month, or the create-class screen if none exists. Do not place a generic analytics dashboard before the register.

Toolbar: EdMar Attendance Register; class/form selector; school name; academic year and term; month previous/next and picker; Students; Calendar; Reports; Print; save-state indicator. Keep one primary heading. Use a restrained navy, white and gold palette with readable neutral grid lines.

Register header structure:

1. Optional week bands for orientation.
2. Actual date, spanning both session columns.
3. Day letter (M, T, W, T, F; S if enabled), spanning both session columns.
4. The numbers 1 and 2 directly below the day. Do not replace these with a single daily cell or AM/PM text.

Use a semantic HTML table with grouped column headers and accessible descriptions. Actual dates disambiguate the two T headings. Display the 1/2 legend above the table.

Example required HTML shape, repeated per actual date:

```html
<tr><th colspan="2">14 September</th></tr>
<tr><th colspan="2">M</th></tr>
<tr><th>1</th><th>2</th></tr>
```

This fragment illustrates grouped headings only; the implementation must include student-name headers and matching cells for every visible date.

Rows: BOYS section heading → numbered students → boys subtotal; GIRLS heading → numbered students → girls subtotal; combined totals. Display surname followed by given names. Students without a confirmed group remain in an import review queue and cannot enter the register silently.

Keep number/name columns sticky on the left and date headers sticky at the top. The register region scrolls horizontally and vertically; provide a visible horizontal scrollbar. Do not shrink a full month into unreadable cells. Use approximately 220–280 px for names and 42–48 px for session cells on desktop. Long names wrap or reveal their complete text accessibly. Group separators have strong visual distinction.

On phones preserve the same day/1/2 structure with horizontal scrolling; default to today's nearby dates. Provide Today and Jump to date controls. Avoid page-wide overflow beyond the register container. Controls remain touch-accessible and usable at 200% zoom.

Each editable cell opens P, A, L, Ex and Clear choices. Keyboard: arrows navigate, Enter opens choices, P/A/L set marks, E sets Ex, Delete clears, Escape closes. Include text labels; colour must not be the only status indicator. Announce save failures and completion status accessibly.

Optional convenience included in this build: “Mark unmarked present” for the explicitly selected date and session only, with a count preview. It must preserve existing A/L/Ex/P entries. No automatic marking on opening a register. Clearing a whole session requires a preview and explicit confirmation.

## 4. Student and calendar workflows

### Student creation

Fields: surname, given names, register group (Boy/Girl), optional admission number, enrolment start, optional end date. Do not collect unnecessary contact, health or identity information. Preserve punctuation, accents and original spelling. Never guess group or split an ambiguous full name automatically.

Pasted list: accept one name per line, show editable surname/given-name columns and group selection, then confirm import. A group can be selected for the whole batch but must be visible in preview.

CSV template: admission_number,surname,given_names,register_group,start_date,end_date. Group values Boy/Girl; dates YYYY-MM-DD. Provide template download. Limit imports to 500 rows and 1 MB as adjustable implementation defaults. Validate all rows before committing, return line-specific errors and import transactionally. Reject malformed CSV safely. Duplicate admission numbers are blocked within a teacher workspace. Name matches produce warnings, not automatic merges, because different children may share a name. Explicitly allow a genuine same-name student with a new ID.

Names are not identifiers. Editing spelling must not detach attendance. Archive/withdraw students using effective dates; retain historical records. A transfer ends the old enrolment and creates a new one. No hard-delete control for students with attendance. New academic-year classes get new enrolments; never copy old attendance marks.

### Calendar

Configure academic-year bounds, term dates, weekdays and class-specific closures or half-days. Generate open morning/afternoon slots deterministically. Disable closed cells and exclude them from totals. Default timezone America/Jamaica; use database DATE for attendance dates and timestamps for audit events.

Calendar changes affecting existing marked slots must be blocked pending a review showing affected dates and counts. Preserve original marks and audit the explicit calendar correction; closed slots do not contribute to current totals. Never silently delete existing records. Term gaps are closed by default. Enforce date bounds and test leap years and months with five partial weeks.

## 5. Proposed technical architecture

Use the owner's stack: Cursor or Claude for development; GitHub for source/CI; Vercel for the web application; Supabase for authentication and PostgreSQL. Build a TypeScript Next.js App Router application with React, Tailwind and accessible components. Pin compatible stable versions when implementation begins and commit the lockfile; do not assume version numbers from this document.

Use server components for authenticated initial loading and a client component for interactive grid editing, following the [Next.js server/client component guidance](https://nextjs.org/docs/app/getting-started/server-and-client-components). No separate Python server, AI service or background scheduler is required.

Use authenticated server endpoints for commands and month loading. Preserve the requesting user's identity through Supabase calls. Enforce ownership at the database as well as at the endpoint. The database is the source of truth; localStorage must not be the primary register database.

Version 1 works online. On disconnection, show “Offline—changes not saved”, keep pending edits in memory and permit retry after reconnect. Warn before leaving with pending edits. Do not claim durable offline support; refreshing can lose unsaved edits. Do not cache student data in a service worker. Installable PWA and durable offline queues are later additions.

### Suggested repository structure

```text
src/app/(auth)/login/
src/app/(app)/register/[classId]/
src/app/(app)/students/
src/app/(app)/calendar/
src/app/(app)/reports/
src/app/api/classes/
src/app/api/attendance/
src/app/api/imports/
src/components/register/
src/lib/attendance/rules.ts
src/lib/attendance/summaries.ts
src/lib/calendar/
src/lib/imports/
src/lib/supabase/
supabase/migrations/
supabase/tests/
tests/unit/
tests/e2e/
docs/
```

## 6. Data model and invariants

All business tables use UUID primary keys, owner_id and appropriate timestamps. owner_id is assigned from authenticated identity, not trusted from client input. The following is a schema contract; Cursor must implement migrations, types, indexes and constraints.

| Table | Essential columns / responsibility |
|---|---|
| teacher_settings | owner_id unique, school_name, timezone |
| academic_years | owner_id, label, start_date, end_date |
| terms | owner_id, academic_year_id, label, start_date, end_date |
| classes | owner_id, academic_year_id, name, weekday configuration, archived_at |
| students | owner_id, surname, given_names, admission_number nullable, archived_at |
| enrolments | owner_id, class_id, student_id, register_group, start_date, end_date nullable |
| calendar_sessions | owner_id, class_id, date, session 1/2, is_open, closure_reason, revision |
| attendance_records | owner_id, enrolment_id, calendar_session_id, status nullable, revision, updated_by, updated_at |
| audit_events | owner_id, actor_id, entity_type/id, action, old/new changed fields, event_time, request_id |
| command_receipts | owner_id, request_id unique within owner, payload_hash, result, created_at |

Use composite foreign keys or equivalent database enforcement so a child cannot reference another owner's parent, and attendance cannot join an enrolment to a session from another class. Enforce start <= end, term containment in academic year, status enum, session enum and uniqueness (class,date,session) and (enrolment,calendar_session). Prevent overlapping enrolments for the same student in the same class. Add a partial unique owner/admission-number index where the number exists.

Group is stored on enrolment so historical class grouping survives later transfers. Group corrections within an enrolment are explicit audited corrections. Preserve history; do not add a gender-inference feature.

Index owner/class/date session lookups, enrolment class/date queries and record session/enrolment joins. Load one month in bounded queries; avoid a request per cell/student. Calculate summaries from source data rather than maintaining mutable counters that can drift.

## 7. Access, save integrity and command contracts

Only authenticated owners access their records. Enable RLS and least-privilege grants on exposed tables, with ownership checks for SELECT, INSERT and UPDATE; protect DELETE separately. Views must preserve caller security. Do not put a Supabase secret or service-role key in browser code. These requirements follow [Supabase's RLS guidance](https://supabase.com/docs/guides/database/postgres/row-level-security).

Do not trust client roles or user-editable auth metadata. Audit events must be generated from committed database mutations using a protected trigger/function path; clients cannot forge, modify or delete audit entries. Any privileged function needs a fixed search path, restricted execution permissions and explicit ownership validation. Test its direct invocation. Keep audit and record changes atomic.

| Operation | Request / outcome |
|---|---|
| Load month | classId + YYYY-MM; enrolments, sessions, records/revisions and summary; scoped to owner |
| Update marks | requestId + up to 100 {enrolmentId,sessionId,status,expectedRevision}; atomic success or conflict |
| Import students | requestId + validated preview rows; atomic import result with IDs |
| Edit calendar | expectedRevision + changes + explicit impact acknowledgement where needed |
| Export | classId/month; authorised report using the same rule functions |

Create missing attendance rows with revision 1; an unmarked missing record has expectedRevision 0. Retain a nullable-status row when cleared so revision history does not reset. For updates perform compare-and-swap atomically. A stale revision returns 409 and authoritative values; never silently overwrite another browser tab. A repeated requestId with identical payload returns the original committed result; the same ID with different payload is rejected. Store receipts in the same transaction. Use owner-scoped receipt visibility and prevent client fabrication.

The grid may display optimistic changes but label them Saving until the server confirms. Reconcile totals with confirmed state and clearly identify pending totals. Validation failure, expired login, conflict and network failure each get actionable messages. Use structured input validation, bounded payloads and same-origin/CSRF protection for cookie-authenticated commands. Never log class lists, passwords or tokens.

## 8. Reports and exports

Provide daily session summary, monthly register, per-student monthly summary, and boys/girls/combined monthly summary. Every report states school/class, period, generation time, rule version and completion status. Include the P/A/L/Ex legend and morning P-only rule.

CSV export is required. Neutralise formula injection in user-entered text fields beginning with spreadsheet formula characters; correctly quote commas, quotes and line breaks. Provide printable landscape register with repeated date/name headers and horizontal page segmentation by week when needed. Never fit an entire month onto one illegible page. Browser Print / Save as PDF is sufficient; a dedicated PDF-generation service is unnecessary.

Reports must display scheduled class sessions separately from attended student-sessions. If no open sessions exist, show zero sessions and N/A percentages. Exports must match the saved register, not unconfirmed edits.

## 9. Build sequence and acceptance gates

Complete each stage before advancing. Document commands actually run and observed results; no invented PASS statements.

1. Repository inspection and scaffold: read existing project instructions, preserve unrelated code, pin dependencies, add env example and login shell. Gate: install, typecheck and build.
2. Database/authentication: migrations, RLS, constraints, owner isolation and test fixtures. Gate: two different teacher accounts cannot read or mutate one another's records through direct database/API access.
3. Classes/calendar/students: typed entry, paste preview, CSV validation, alphabetical grouping, dated enrolments and closures. Gate: class with boys/girls plus mid-month arrival/withdrawal behaves correctly.
4. Attendance engine first: implement rule function and eligible-slot summaries before grid wiring. Gate: all 25 morning/afternoon status pairs (including null) agree with the formula, plus calendar/enrolment boundary cases.
5. Register interface: exact merged day headers, independent columns, accessible choices, sticky names/headers, scroll behaviour and saved state. Gate: owner example L/P produces 0 morning, 1 afternoon after reload.
6. Persistence integrity: atomic batch commands, revisions, receipts, audit and failure states. Gate: refresh persistence; concurrent-tab conflict; duplicate network retry; failed batch leaves no partial changes.
7. Summaries/exports: daily and monthly counts, provisional completion and print/CSV. Gate: hand-calculated fixture below matches screen and export.
8. Release preparation: mobile/desktop browser checks, CI, preview deployment and setup guide. Gate: all required checks pass on preview. This document authorises building and preview preparation, not changing an unrelated live database or publishing production automatically.

### Hand-calculated integration fixture

Two open full days, four students enrolled for both dates:

| Student | Group | Day 1 morning/afternoon | Day 2 morning/afternoon | Attended sessions |
|---|---|---|---|---:|
| Brown, Adam | Boy | L / P | P / P | 3 |
| Edwards, Daniel | Boy | P / A | A / L | 2 |
| Adams, Alicia | Girl | P / P | Ex / P | 3 |
| Williams, Brianna | Girl | A / Ex | L / P | 1 |

Expected Day 1: boys 1 morning/1 afternoon; girls 1/1; combined 2/2. Day 2: boys 1/2; girls 0/2; combined 1/4. Period totals: boys 5, girls 4, combined 9 attended student-sessions; morning 3, afternoon 6; scheduled class sessions 4; possible student-sessions 16; completion 100%; attendance 56.3% rounded. Original marks: P=8, L=3, A=3, Ex=2. The two morning L marks contribute zero; the afternoon L contributes one.

### Additional essential tests

- Blank remains incomplete; future dates cannot be marked.
- Closed sessions and dates outside enrolment contribute neither credits nor possible slots.
- Twenty full school days yield 40 scheduled sessions; one afternoon closure reduces this to 39.
- Empty class and no-open-session month do not divide by zero.
- Duplicate names can coexist; duplicate admission numbers cannot.
- Sorting handles case, accents, apostrophes and repeated surnames predictably without altering display spelling.
- Archived students retain past attendance; name edits retain the same record links.
- Calendar change on a marked slot requires impact review and leaves an audit record.
- Users cannot change owner_id, forge parent links, modify audit entries or bypass commands to write invalid records.
- A 60-student, 31-day grid loads through bounded queries and remains responsive while scrolling.
- At 390 px mobile width and 1366 px desktop width, headers, session numbers, names, menus and totals remain usable.
- Export formula-like student names remain plain text. Printed register preserves session headings on every segment.

## 10. Environment and handover

Required configuration: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY and NEXT_PUBLIC_APP_URL. No AI key. Keep privileged keys out of ordinary attendance requests; if an implementation genuinely requires a separate administrative key, justify it and store it server-side only. Configure auth redirect URLs per environment.

Separate development/preview data from production student data. Commit schema migrations and test them locally before applying to a target. Document backup availability and restore procedure for the selected Supabase plan; do not assert a backup policy exists without verifying it. Production migration instructions must identify the target and migration files, include preflight checks and a non-destructive recovery plan. No database resets on production.

Required developer handover: working source and lockfile; migrations/RLS; generated database types; rule tests; owner-isolation tests; browser tests; fictional seed data; env template without secrets; README setup commands; deployment/migration instructions; test report with remaining limitations. No feature is complete if it only works with hard-coded demo data.

## 11. Prompt to paste into Cursor / Claude

> Build EdMar Attendance Register using this document as the source of truth. Read the entire specification first and inspect the repository and its instructions. Implement the eight stages in order, using Next.js/TypeScript, Supabase, GitHub and Vercel as specified. This is an attendance-only app with no AI, OCR, marks module or payment features. The main interface must be the paper-style monthly register, boys and girls separately alphabetised, each day heading spanning exactly two columns labelled 1 and 2. Morning counts P only; afternoon counts P or L in that afternoon cell. Never copy morning L into afternoon attendance automatically or double-count a student. Preserve independent statuses and distinguish blank, closed and ineligible cells. Implement real authenticated persistence, database ownership enforcement, atomic saves, conflict handling, audit trails and accurate exports. Use the required fixture and boundary tests as acceptance gates. Keep the stated defaults visible in documentation and do not silently change attendance semantics. Work through implementation and verification autonomously; ask only if a genuine blocker prevents progress. Do not alter unrelated production systems. Finish with files changed, checks actually run, results, remaining blockers and exact setup/deployment steps. Do not claim the application is production-ready until the required gates have passed.

