create table enrolments (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  class_id uuid not null,
  student_id uuid not null,
  register_group register_group not null,
  start_date date not null,
  end_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint enrolments_dates_ordered
    check (end_date is null or start_date <= end_date),
  constraint enrolments_class_fkey
    foreign key (owner_id, class_id)
    references classes (owner_id, id)
    on delete restrict,
  constraint enrolments_student_fkey
    foreign key (owner_id, student_id)
    references students (owner_id, id)
    on delete restrict,
  -- Composite-FK target for attendance_records.
  constraint enrolments_owner_id_id_key unique (owner_id, id),
  -- Spec section 9: "Prevent overlapping enrolments for the same student
  -- in the same class." A null end_date is an open-ended enrolment
  -- (daterange treats it as unbounded upper).
  constraint enrolments_no_overlap
    exclude using gist (
      class_id with =,
      student_id with =,
      daterange(start_date, end_date, '[]') with &&
    )
);

create index enrolments_class_idx on enrolments (owner_id, class_id);
create index enrolments_student_idx on enrolments (owner_id, student_id);

alter table enrolments enable row level security;
alter table enrolments force row level security;

create policy enrolments_select_own on enrolments
  for select using (owner_id = auth.uid());
create policy enrolments_insert_own on enrolments
  for insert with check (owner_id = auth.uid());
create policy enrolments_update_own on enrolments
  for update using (owner_id = auth.uid()) with check (owner_id = auth.uid());
