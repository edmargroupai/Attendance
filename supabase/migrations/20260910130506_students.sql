create table students (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  surname text not null,
  given_names text not null,
  admission_number text,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- Composite-FK target for enrolments.
  constraint students_owner_id_id_key unique (owner_id, id)
);

-- Spec section 4: "Duplicate admission numbers are blocked within a
-- teacher workspace." Partial so students without one (nullable) never
-- collide with each other.
create unique index students_owner_admission_number_key
  on students (owner_id, admission_number)
  where admission_number is not null;

create index students_owner_surname_idx on students (owner_id, surname, given_names);

alter table students enable row level security;
alter table students force row level security;

create policy students_select_own on students
  for select using (owner_id = auth.uid());
create policy students_insert_own on students
  for insert with check (owner_id = auth.uid());
create policy students_update_own on students
  for update using (owner_id = auth.uid()) with check (owner_id = auth.uid());
