-- Spec section 7 command contract: "Update marks: requestId + up to 100
-- {enrolmentId,sessionId,status,expectedRevision}; atomic success or
-- conflict." SECURITY INVOKER (the default) - RLS and owner_id already
-- scope everything to the caller.
--
-- Design: conflicts are checked in a first pass, before any write
-- happens (phase 1). If any row's expectedRevision doesn't match, NO
-- writes occur at all and a structured {"status":"conflict",...} result
-- is returned (not an exception) - spec: "A stale revision returns 409
-- and authoritative values; never silently overwrite another browser
-- tab." Only if every row matches does phase 2 apply the updates. Because
-- the whole function body is one statement in the caller's transaction,
-- any unexpected error anywhere aborts the entire call with no partial
-- writes.
--
-- Idempotency: p_payload_hash is a hash of p_updates computed by the
-- caller (src/app/api/attendance/route.ts). A repeated request_id with
-- the same hash replays the stored result without re-running anything;
-- the same request_id with a different hash is rejected outright (spec
-- section 7).
create function update_attendance_batch(
  p_request_id uuid,
  p_payload_hash text,
  p_updates jsonb
)
returns jsonb
language plpgsql
set search_path = ''
as $$
declare
  v_owner uuid := auth.uid();
  v_existing_receipt record;
  v_update jsonb;
  v_enrolment_id uuid;
  v_session_id uuid;
  v_status text;
  v_expected_revision int;
  v_current record;
  v_conflicts jsonb := '[]'::jsonb;
  v_results jsonb := '[]'::jsonb;
  v_row jsonb;
  v_result jsonb;
begin
  if p_request_id is null then
    raise exception 'p_request_id is required';
  end if;

  select * into v_existing_receipt
    from public.command_receipts
    where owner_id = v_owner and request_id = p_request_id;

  if found then
    if v_existing_receipt.payload_hash = p_payload_hash then
      return v_existing_receipt.result;
    else
      raise exception 'request_id % was already used with a different payload', p_request_id;
    end if;
  end if;

  if jsonb_typeof(p_updates) is distinct from 'array' then
    raise exception 'p_updates must be a JSON array';
  end if;
  if jsonb_array_length(p_updates) = 0 or jsonb_array_length(p_updates) > 100 then
    raise exception 'p_updates must contain between 1 and 100 entries';
  end if;

  -- Phase 1: check every row's revision before writing anything.
  for v_update in select * from jsonb_array_elements(p_updates)
  loop
    v_enrolment_id := (v_update->>'enrolmentId')::uuid;
    v_session_id := (v_update->>'calendarSessionId')::uuid;
    v_expected_revision := (v_update->>'expectedRevision')::int;

    select id, revision, status into v_current
      from public.attendance_records
      where owner_id = v_owner
        and enrolment_id = v_enrolment_id
        and calendar_session_id = v_session_id;

    if not found then
      if v_expected_revision <> 0 then
        v_conflicts := v_conflicts || jsonb_build_object(
          'enrolmentId', v_enrolment_id, 'calendarSessionId', v_session_id,
          'currentRevision', 0, 'currentStatus', null
        );
      end if;
    else
      if v_current.revision <> v_expected_revision then
        v_conflicts := v_conflicts || jsonb_build_object(
          'enrolmentId', v_enrolment_id, 'calendarSessionId', v_session_id,
          'currentRevision', v_current.revision, 'currentStatus', v_current.status
        );
      end if;
    end if;
  end loop;

  if jsonb_array_length(v_conflicts) > 0 then
    v_result := jsonb_build_object('status', 'conflict', 'conflicts', v_conflicts);
    insert into public.command_receipts (owner_id, request_id, payload_hash, result)
    values (v_owner, p_request_id, p_payload_hash, v_result);
    return v_result;
  end if;

  -- Phase 2: every row matched its expected revision - apply them all.
  for v_update in select * from jsonb_array_elements(p_updates)
  loop
    v_enrolment_id := (v_update->>'enrolmentId')::uuid;
    v_session_id := (v_update->>'calendarSessionId')::uuid;
    v_status := v_update->>'status';
    v_expected_revision := (v_update->>'expectedRevision')::int;

    if v_expected_revision = 0 then
      insert into public.attendance_records (enrolment_id, calendar_session_id, status, revision, updated_by, updated_at)
      values (v_enrolment_id, v_session_id, nullif(v_status, '')::public.attendance_status, 1, v_owner, now())
      returning to_jsonb(attendance_records.*) into v_row;
    else
      update public.attendance_records
      set status = nullif(v_status, '')::public.attendance_status,
          revision = revision + 1,
          updated_by = v_owner,
          updated_at = now()
      where owner_id = v_owner
        and enrolment_id = v_enrolment_id
        and calendar_session_id = v_session_id
      returning to_jsonb(attendance_records.*) into v_row;
    end if;

    v_results := v_results || jsonb_build_object(
      'enrolmentId', v_enrolment_id,
      'calendarSessionId', v_session_id,
      'revision', v_row->'revision',
      'status', v_row->'status'
    );
  end loop;

  v_result := jsonb_build_object('status', 'ok', 'updates', v_results);

  insert into public.command_receipts (owner_id, request_id, payload_hash, result)
  values (v_owner, p_request_id, p_payload_hash, v_result);

  return v_result;
end;
$$;

grant execute on function update_attendance_batch(uuid, text, jsonb) to authenticated;
