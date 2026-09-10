create table attendance_records (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  enrolment_id uuid not null,
  calendar_session_id uuid not null,
  status attendance_status,
  revision integer not null default 1,
  updated_by uuid references auth.users (id),
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  constraint attendance_records_enrolment_fkey
    foreign key (owner_id, enrolment_id)
    references enrolments (owner_id, id)
    on delete restrict,
  constraint attendance_records_calendar_session_fkey
    foreign key (owner_id, calendar_session_id)
    references calendar_sessions (owner_id, id)
    on delete restrict,
  -- Spec section 9: "uniqueness ... (enrolment,calendar_session)".
  constraint attendance_records_enrolment_session_key
    unique (enrolment_id, calendar_session_id)
);

create index attendance_records_session_idx on attendance_records (owner_id, calendar_session_id);
create index attendance_records_enrolment_idx on attendance_records (owner_id, enrolment_id);

alter table attendance_records enable row level security;
alter table attendance_records force row level security;

create policy attendance_records_select_own on attendance_records
  for select using (owner_id = auth.uid());
create policy attendance_records_insert_own on attendance_records
  for insert with check (owner_id = auth.uid());
create policy attendance_records_update_own on attendance_records
  for update using (owner_id = auth.uid()) with check (owner_id = auth.uid());

-- Spec section 6: "attendance cannot join an enrolment to a session from
-- another class." The composite FKs above only guarantee same owner, not
-- same class, so that half needs a cross-table trigger check.
create function attendance_records_check_same_class()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  enrolment_class uuid;
  session_class uuid;
begin
  select class_id into enrolment_class
    from public.enrolments
    where id = new.enrolment_id and owner_id = new.owner_id;

  select class_id into session_class
    from public.calendar_sessions
    where id = new.calendar_session_id and owner_id = new.owner_id;

  if enrolment_class is null or session_class is null then
    raise exception 'enrolment or calendar_session not found for owner';
  end if;

  if enrolment_class <> session_class then
    raise exception
      'attendance_records.enrolment_id (class %) and calendar_session_id (class %) belong to different classes',
      enrolment_class, session_class;
  end if;

  return new;
end;
$$;

create trigger attendance_records_same_class
  before insert or update on attendance_records
  for each row
  execute function attendance_records_check_same_class();
