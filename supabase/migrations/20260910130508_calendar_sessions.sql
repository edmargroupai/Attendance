create table calendar_sessions (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  class_id uuid not null,
  date date not null,
  session smallint not null,
  is_open boolean not null default true,
  closure_reason text,
  revision integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint calendar_sessions_session_valid check (session in (1, 2)),
  constraint calendar_sessions_closure_reason_requires_closed
    check (is_open or closure_reason is not null),
  constraint calendar_sessions_class_fkey
    foreign key (owner_id, class_id)
    references classes (owner_id, id)
    on delete restrict,
  -- Composite-FK target for attendance_records.
  constraint calendar_sessions_owner_id_id_key unique (owner_id, id),
  -- Spec section 9: "Enforce ... uniqueness (class,date,session)".
  constraint calendar_sessions_class_date_session_key unique (class_id, date, session)
);

create index calendar_sessions_class_date_idx on calendar_sessions (owner_id, class_id, date);

alter table calendar_sessions enable row level security;
alter table calendar_sessions force row level security;

create policy calendar_sessions_select_own on calendar_sessions
  for select using (owner_id = auth.uid());
create policy calendar_sessions_insert_own on calendar_sessions
  for insert with check (owner_id = auth.uid());
create policy calendar_sessions_update_own on calendar_sessions
  for update using (owner_id = auth.uid()) with check (owner_id = auth.uid());
