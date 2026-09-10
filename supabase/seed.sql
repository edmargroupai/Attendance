-- Fictional demo data for local development only (`supabase db reset`
-- runs this against the local dev stack - never the linked project).
-- Spec section 10 handover requirement: "fictional seed data... No
-- feature is complete if it only works with hard-coded demo data" - this
-- is for trying the app locally, not a substitute for real testing.
insert into auth.users (
  id, email, encrypted_password, email_confirmed_at,
  created_at, updated_at, raw_app_meta_data, raw_user_meta_data, aud, role
) values (
  '00000000-0000-0000-0000-000000000001', 'demo@example.com',
  crypt('demo-password', gen_salt('bf')), now(), now(), now(), '{}', '{}',
  'authenticated', 'authenticated'
);

insert into teacher_settings (owner_id, school_name, timezone) values (
  '00000000-0000-0000-0000-000000000001', 'EdMar Demo School', 'America/Jamaica'
);

insert into academic_years (id, owner_id, label, start_date, end_date) values (
  '00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001',
  '2026-2027', '2026-09-01', '2027-06-30'
);

insert into classes (id, owner_id, academic_year_id, name) values (
  '00000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000002', 'Grade 1A'
);

-- import_students reads auth.uid() (via request.jwt.claims), which is
-- otherwise unset in a plain psql/seed session - switch role and set the
-- claim for this session so it resolves to the demo teacher, the same
-- way the real app's request would. SET (session-level, not SET LOCAL)
-- so it survives the auto-commit between statements.
set role authenticated;
set request.jwt.claims to '{"sub":"00000000-0000-0000-0000-000000000001","role":"authenticated"}';

select import_students(
  '00000000-0000-0000-0000-000000000003'::uuid,
  '[
    {"admission_number":"D100","surname":"Brown","given_names":"Adam","register_group":"Boy","start_date":"2026-09-01","end_date":null},
    {"admission_number":"D101","surname":"Edwards","given_names":"Daniel","register_group":"Boy","start_date":"2026-09-15","end_date":null},
    {"admission_number":"D102","surname":"Adams","given_names":"Alicia","register_group":"Girl","start_date":"2026-09-01","end_date":null},
    {"admission_number":"D103","surname":"Williams","given_names":"Brianna","register_group":"Girl","start_date":"2026-09-01","end_date":null}
  ]'::jsonb
);

reset role;

-- Demo login: demo@example.com / demo-password
