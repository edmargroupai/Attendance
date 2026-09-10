-- One row per teacher workspace (spec section 1: "one teacher-owned
-- workspace may contain multiple classes"). owner_id is the primary key
-- rather than a separate id column since this table is 1:1 with a user.
create table teacher_settings (
  owner_id uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  school_name text,
  timezone text not null default 'America/Jamaica',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table teacher_settings enable row level security;
alter table teacher_settings force row level security;

create policy teacher_settings_select_own on teacher_settings
  for select
  using (owner_id = auth.uid());

create policy teacher_settings_insert_own on teacher_settings
  for insert
  with check (owner_id = auth.uid());

create policy teacher_settings_update_own on teacher_settings
  for update
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

-- No delete policy: a teacher's settings row is not client-deletable.
