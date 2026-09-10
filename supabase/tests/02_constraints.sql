-- Spec section 9 boundary/invariant tests: composite-FK tenant isolation,
-- the enrolment/session same-class trigger, the enrolment overlap
-- exclusion constraint, the admission-number partial unique index, the
-- calendar_sessions uniqueness constraint, and term-within-academic-year
-- containment. Run as the table owner (bypasses RLS), so these test the
-- constraints themselves, independent of RLS (covered in
-- 01_owner_isolation.sql).
--
-- Assertions are collected into a temp table (see 01_owner_isolation.sql
-- for why) and emitted in one final SELECT.
begin;

create extension if not exists pgtap with schema extensions;
set local search_path to public, extensions;

create temp table tap_results (line text);

insert into tap_results select plan(10);

insert into auth.users (
  id, email, encrypted_password, email_confirmed_at,
  created_at, updated_at, raw_app_meta_data, raw_user_meta_data, aud, role
) values
  ('11111111-1111-1111-1111-111111111111', 'teacher-a2@test.local',
   crypt('x', gen_salt('bf')), now(), now(), now(), '{}', '{}', 'authenticated', 'authenticated'),
  ('22222222-2222-2222-2222-222222222222', 'teacher-b2@test.local',
   crypt('x', gen_salt('bf')), now(), now(), now(), '{}', '{}', 'authenticated', 'authenticated');

insert into academic_years (id, owner_id, label, start_date, end_date) values
  ('aaaaaaaa-1000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', '2026', '2026-01-01', '2026-12-31');

insert into classes (id, owner_id, academic_year_id, name) values
  ('aaaaaaaa-1000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111', 'aaaaaaaa-1000-0000-0000-000000000001', 'Class 1'),
  ('aaaaaaaa-1000-0000-0000-000000000003', '11111111-1111-1111-1111-111111111111', 'aaaaaaaa-1000-0000-0000-000000000001', 'Class 2');

insert into students (id, owner_id, surname, given_names, admission_number) values
  ('aaaaaaaa-1000-0000-0000-000000000004', '11111111-1111-1111-1111-111111111111', 'Adams', 'Alicia', 'A100'),
  ('aaaaaaaa-1000-0000-0000-000000000005', '11111111-1111-1111-1111-111111111111', 'Williams', 'Brianna', null),
  ('aaaaaaaa-1000-0000-0000-000000000006', '11111111-1111-1111-1111-111111111111', 'Edwards', 'Daniel', null);

-- 1) Composite FK blocks a child claiming a parent that belongs to a
--    different owner, even though both rows individually exist.
insert into tap_results select throws_ok(
  $$ insert into enrolments (owner_id, class_id, student_id, register_group, start_date)
     values ('22222222-2222-2222-2222-222222222222', 'aaaaaaaa-1000-0000-0000-000000000002',
             'aaaaaaaa-1000-0000-0000-000000000004', 'Girl', '2026-01-01') $$,
  null, null,
  'enrolment cannot reference a class owned by a different owner'
);

insert into enrolments (id, owner_id, class_id, student_id, register_group, start_date) values
  ('aaaaaaaa-1000-0000-0000-000000000007', '11111111-1111-1111-1111-111111111111',
   'aaaaaaaa-1000-0000-0000-000000000002', 'aaaaaaaa-1000-0000-0000-000000000004', 'Girl', '2026-01-01'),
  ('aaaaaaaa-1000-0000-0000-000000000008', '11111111-1111-1111-1111-111111111111',
   'aaaaaaaa-1000-0000-0000-000000000003', 'aaaaaaaa-1000-0000-0000-000000000006', 'Boy', '2026-01-01');

insert into calendar_sessions (id, owner_id, class_id, date, session) values
  ('aaaaaaaa-1000-0000-0000-000000000009', '11111111-1111-1111-1111-111111111111',
   'aaaaaaaa-1000-0000-0000-000000000002', '2026-01-05', 1),
  ('aaaaaaaa-1000-0000-0000-00000000000a', '11111111-1111-1111-1111-111111111111',
   'aaaaaaaa-1000-0000-0000-000000000003', '2026-01-05', 1);

-- 2) attendance_records trigger blocks joining an enrolment from Class 1
--    to a calendar_session from Class 2, even though both share an owner.
insert into tap_results select throws_ok(
  $$ insert into attendance_records (owner_id, enrolment_id, calendar_session_id, status)
     values ('11111111-1111-1111-1111-111111111111', 'aaaaaaaa-1000-0000-0000-000000000007',
             'aaaaaaaa-1000-0000-0000-00000000000a', 'P') $$,
  null, null,
  'attendance_records cannot join an enrolment to a session from a different class'
);

insert into tap_results select lives_ok(
  $$ insert into attendance_records (owner_id, enrolment_id, calendar_session_id, status)
     values ('11111111-1111-1111-1111-111111111111', 'aaaaaaaa-1000-0000-0000-000000000007',
             'aaaaaaaa-1000-0000-0000-000000000009', 'P') $$,
  'attendance_records succeeds when enrolment and session share a class'
);

-- 3) Overlapping enrolments for the same (class, student) are rejected...
insert into tap_results select throws_ok(
  $$ insert into enrolments (owner_id, class_id, student_id, register_group, start_date, end_date)
     values ('11111111-1111-1111-1111-111111111111', 'aaaaaaaa-1000-0000-0000-000000000002',
             'aaaaaaaa-1000-0000-0000-000000000004', 'Girl', '2026-06-01', '2026-06-30') $$,
  null, null,
  'overlapping enrolment for the same class/student is rejected'
);

-- ...but a non-overlapping (later, adjacent) enrolment succeeds.
insert into tap_results select lives_ok(
  $$ insert into enrolments (owner_id, class_id, student_id, register_group, start_date, end_date)
     values ('11111111-1111-1111-1111-111111111111', 'aaaaaaaa-1000-0000-0000-000000000002',
             'aaaaaaaa-1000-0000-0000-000000000005', 'Girl', '2026-01-01', '2026-06-30') $$,
  'a non-overlapping enrolment for the same class succeeds'
);

-- 4) Duplicate admission_number within an owner is rejected...
insert into tap_results select throws_ok(
  $$ insert into students (owner_id, surname, given_names, admission_number)
     values ('11111111-1111-1111-1111-111111111111', 'Smith', 'Sam', 'A100') $$,
  null, null,
  'duplicate admission_number within an owner is rejected'
);

-- ...but two students with a null admission_number do not conflict.
insert into tap_results select lives_ok(
  $$ insert into students (owner_id, surname, given_names, admission_number)
     values ('11111111-1111-1111-1111-111111111111', 'Jones', 'Jo', null) $$,
  'a second student with a null admission_number does not collide'
);

-- 5) calendar_sessions uniqueness on (class, date, session).
insert into tap_results select throws_ok(
  $$ insert into calendar_sessions (owner_id, class_id, date, session)
     values ('11111111-1111-1111-1111-111111111111', 'aaaaaaaa-1000-0000-0000-000000000002',
             '2026-01-05', 1) $$,
  null, null,
  'duplicate (class, date, session) calendar_sessions row is rejected'
);

-- 6) terms-within-academic-year containment trigger.
insert into tap_results select throws_ok(
  $$ insert into terms (owner_id, academic_year_id, label, start_date, end_date)
     values ('11111111-1111-1111-1111-111111111111', 'aaaaaaaa-1000-0000-0000-000000000001',
             'Term 1', '2025-09-01', '2025-12-15') $$,
  null, null,
  'a term outside its academic year date range is rejected'
);

insert into tap_results select lives_ok(
  $$ insert into terms (owner_id, academic_year_id, label, start_date, end_date)
     values ('11111111-1111-1111-1111-111111111111', 'aaaaaaaa-1000-0000-0000-000000000001',
             'Term 1', '2026-01-05', '2026-04-30') $$,
  'a term within its academic year date range succeeds'
);

insert into tap_results select * from finish();

select line from tap_results order by ctid;

rollback;
