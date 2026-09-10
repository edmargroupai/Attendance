-- Generic audit trigger. SECURITY DEFINER + fixed search_path (spec
-- section 7: "a fixed search path, restricted execution permissions") so
-- it can insert into audit_events (which has no client INSERT policy)
-- regardless of which authenticated user's mutation triggered it.
create function audit_row_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_owner_id uuid;
  v_entity_id uuid;
  v_request_id uuid;
begin
  v_owner_id := coalesce(new.owner_id, old.owner_id);
  v_entity_id := coalesce(new.id, old.id);

  -- Stage 6's command functions set this per-transaction so related
  -- mutations share one request_id; absent outside that path.
  begin
    v_request_id := nullif(current_setting('app.request_id', true), '')::uuid;
  exception when others then
    v_request_id := null;
  end;

  insert into public.audit_events (
    owner_id, actor_id, entity_type, entity_id, action,
    old_data, new_data, request_id
  ) values (
    v_owner_id,
    auth.uid(),
    TG_TABLE_NAME,
    v_entity_id,
    TG_OP,
    case when TG_OP in ('UPDATE', 'DELETE') then to_jsonb(old) else null end,
    case when TG_OP in ('INSERT', 'UPDATE') then to_jsonb(new) else null end,
    v_request_id
  );

  return coalesce(new, old);
end;
$$;

create trigger students_audit
  after insert or update or delete on students
  for each row execute function audit_row_change();

create trigger classes_audit
  after insert or update or delete on classes
  for each row execute function audit_row_change();

create trigger enrolments_audit
  after insert or update or delete on enrolments
  for each row execute function audit_row_change();

create trigger calendar_sessions_audit
  after insert or update or delete on calendar_sessions
  for each row execute function audit_row_change();

create trigger attendance_records_audit
  after insert or update or delete on attendance_records
  for each row execute function audit_row_change();
