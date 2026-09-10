-- Stage 2 gate (spec section 9): "two different teacher accounts cannot
-- read or mutate one another's records through direct database/API
-- access." Simulates PostgREST's per-request auth context (role +
-- request.jwt.claims) the way Supabase does for real requests.
--
-- Every assertion is inserted into a temp table rather than left as a
-- bare `select ok(...)` because the query runner used to execute this
-- file (`supabase db query --file`) only returns the last statement's
-- result set, so all TAP output is collected and emitted in one final
-- SELECT.
begin;

create extension if not exists pgtap with schema extensions;
set local search_path to public, extensions;

create temp table tap_results (line text);
-- The script switches to `authenticated` below to simulate a real
-- request; that role needs explicit access to this session's temp table.
grant insert, select on tap_results to authenticated;

insert into tap_results select plan(9);

-- Two fake teacher accounts (as postgres, bypasses RLS).
insert into auth.users (
  id, email, encrypted_password, email_confirmed_at,
  created_at, updated_at, raw_app_meta_data, raw_user_meta_data, aud, role
) values
  ('11111111-1111-1111-1111-111111111111', 'teacher-a@test.local',
   crypt('x', gen_salt('bf')), now(), now(), now(), '{}', '{}', 'authenticated', 'authenticated'),
  ('22222222-2222-2222-2222-222222222222', 'teacher-b@test.local',
   crypt('x', gen_salt('bf')), now(), now(), now(), '{}', '{}', 'authenticated', 'authenticated');

insert into academic_years (id, owner_id, label, start_date, end_date) values
  ('aaaaaaaa-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', '2026', '2026-01-01', '2026-12-31'),
  ('bbbbbbbb-0000-0000-0000-000000000001', '22222222-2222-2222-2222-222222222222', '2026', '2026-01-01', '2026-12-31');

insert into classes (id, owner_id, academic_year_id, name) values
  ('aaaaaaaa-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111', 'aaaaaaaa-0000-0000-0000-000000000001', 'Grade 1A'),
  ('bbbbbbbb-0000-0000-0000-000000000002', '22222222-2222-2222-2222-222222222222', 'bbbbbbbb-0000-0000-0000-000000000001', 'Grade 1B');

insert into students (id, owner_id, surname, given_names) values
  ('aaaaaaaa-0000-0000-0000-000000000003', '11111111-1111-1111-1111-111111111111', 'Brown', 'Adam'),
  ('bbbbbbbb-0000-0000-0000-000000000003', '22222222-2222-2222-2222-222222222222', 'Green', 'Bella');

insert into enrolments (id, owner_id, class_id, student_id, register_group, start_date) values
  ('aaaaaaaa-0000-0000-0000-000000000004', '11111111-1111-1111-1111-111111111111',
   'aaaaaaaa-0000-0000-0000-000000000002', 'aaaaaaaa-0000-0000-0000-000000000003', 'Boy', '2026-01-01'),
  ('bbbbbbbb-0000-0000-0000-000000000004', '22222222-2222-2222-2222-222222222222',
   'bbbbbbbb-0000-0000-0000-000000000002', 'bbbbbbbb-0000-0000-0000-000000000003', 'Girl', '2026-01-01');

-- Act as teacher A (mirrors what PostgREST sets per-request from a JWT).
set local role authenticated;
set local request.jwt.claims to '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}';

insert into tap_results select is(
  (select count(*)::int from classes), 1,
  'teacher A sees exactly their own class'
);
insert into tap_results select is(
  (select count(*)::int from students), 1,
  'teacher A sees exactly their own student'
);
insert into tap_results select is(
  (select count(*)::int from enrolments), 1,
  'teacher A sees exactly their own enrolment'
);
insert into tap_results select is(
  (select name from classes limit 1), 'Grade 1A',
  'the class teacher A sees is their own, not teacher B''s'
);

-- Forged INSERT: teacher A tries to write a row owned by teacher B.
insert into tap_results select throws_ok(
  $$ insert into classes (owner_id, academic_year_id, name)
     values ('22222222-2222-2222-2222-222222222222', 'bbbbbbbb-0000-0000-0000-000000000001', 'forged') $$,
  null, null,
  'teacher A cannot INSERT a class with owner_id = teacher B'
);

-- Silent-no-op UPDATE: RLS USING filters teacher B's row out of teacher
-- A's updatable set entirely, so this affects 0 rows rather than erroring.
update classes set name = 'hacked' where id = 'bbbbbbbb-0000-0000-0000-000000000002';

-- Switch to teacher B and confirm symmetric isolation, and that the
-- UPDATE attempt above did not change their data.
set local request.jwt.claims to '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated"}';

insert into tap_results select is(
  (select count(*)::int from classes), 1,
  'teacher B sees exactly their own class'
);
insert into tap_results select is(
  (select name from classes limit 1), 'Grade 1B',
  'teacher B class name is unchanged after teacher A''s UPDATE attempt'
);
insert into tap_results select is(
  (select count(*)::int from enrolments), 1,
  'teacher B sees exactly their own enrolment'
);
insert into tap_results select throws_ok(
  $$ insert into classes (owner_id, academic_year_id, name)
     values ('11111111-1111-1111-1111-111111111111', 'aaaaaaaa-0000-0000-0000-000000000001', 'forged') $$,
  null, null,
  'teacher B cannot INSERT a class with owner_id = teacher A'
);

insert into tap_results select * from finish();

select line from tap_results order by ctid;

rollback;
