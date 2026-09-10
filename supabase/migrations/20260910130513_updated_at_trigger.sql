create function set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger teacher_settings_set_updated_at
  before update on teacher_settings
  for each row execute function set_updated_at();

create trigger academic_years_set_updated_at
  before update on academic_years
  for each row execute function set_updated_at();

create trigger terms_set_updated_at
  before update on terms
  for each row execute function set_updated_at();

create trigger classes_set_updated_at
  before update on classes
  for each row execute function set_updated_at();

create trigger students_set_updated_at
  before update on students
  for each row execute function set_updated_at();

create trigger enrolments_set_updated_at
  before update on enrolments
  for each row execute function set_updated_at();

create trigger calendar_sessions_set_updated_at
  before update on calendar_sessions
  for each row execute function set_updated_at();

-- attendance_records.updated_at is managed by Stage 6's command function
-- (it needs to set updated_at alongside revision/updated_by atomically
-- in application logic), so no generic trigger here.
