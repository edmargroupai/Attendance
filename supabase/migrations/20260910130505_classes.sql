-- Spec section 1 defaults: weekdays Monday-Friday open by default,
-- Saturday can be enabled; Sunday is never a teaching day so it has no
-- column.
create table classes (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  academic_year_id uuid not null,
  name text not null,
  monday boolean not null default true,
  tuesday boolean not null default true,
  wednesday boolean not null default true,
  thursday boolean not null default true,
  friday boolean not null default true,
  saturday boolean not null default false,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint classes_academic_year_fkey
    foreign key (owner_id, academic_year_id)
    references academic_years (owner_id, id)
    on delete restrict,
  -- Composite-FK target for enrolments/calendar_sessions.
  constraint classes_owner_id_id_key unique (owner_id, id)
);

create index classes_academic_year_idx on classes (owner_id, academic_year_id);

alter table classes enable row level security;
alter table classes force row level security;

create policy classes_select_own on classes
  for select using (owner_id = auth.uid());
create policy classes_insert_own on classes
  for insert with check (owner_id = auth.uid());
create policy classes_update_own on classes
  for update using (owner_id = auth.uid()) with check (owner_id = auth.uid());
