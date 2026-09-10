-- Spec section 4: "Validate all rows before committing, return
-- line-specific errors and import transactionally." SECURITY INVOKER
-- (the default) - callers only ever create rows under their own owner_id
-- via the normal column defaults/RLS, so no elevated privileges are
-- needed. One call handles both the typed single-entry form and the
-- paste/CSV batch import (Stage 3 UI), since a 1-row array is a valid
-- input.
--
-- A plpgsql function body runs inside the calling statement's
-- transaction: an unhandled exception aborts the whole call, rolling
-- back every insert made earlier in the loop - that's what makes this
-- atomic without needing an explicit BEGIN/COMMIT.
create function import_students(p_class_id uuid, p_rows jsonb)
returns jsonb
language plpgsql
set search_path = ''
as $$
declare
  v_owner uuid := auth.uid();
  v_row jsonb;
  v_idx int := 0;
  v_student_id uuid;
  v_results jsonb := '[]'::jsonb;
begin
  if jsonb_typeof(p_rows) is distinct from 'array' then
    raise exception 'p_rows must be a JSON array';
  end if;

  if jsonb_array_length(p_rows) = 0 then
    raise exception 'p_rows must contain at least one row';
  end if;

  if jsonb_array_length(p_rows) > 500 then
    raise exception 'cannot import more than 500 rows in a single call';
  end if;

  -- Defense in depth: RLS already enforces this on the enrolment insert
  -- below, but failing fast here gives a clearer error.
  perform 1 from public.classes where id = p_class_id and owner_id = v_owner;
  if not found then
    raise exception 'class % not found for current user', p_class_id;
  end if;

  for v_row in select * from jsonb_array_elements(p_rows)
  loop
    v_idx := v_idx + 1;

    begin
      insert into public.students (surname, given_names, admission_number)
      values (
        v_row->>'surname',
        v_row->>'given_names',
        nullif(v_row->>'admission_number', '')
      )
      returning id into v_student_id;

      insert into public.enrolments (class_id, student_id, register_group, start_date, end_date)
      values (
        p_class_id,
        v_student_id,
        (v_row->>'register_group')::public.register_group,
        (v_row->>'start_date')::date,
        nullif(v_row->>'end_date', '')::date
      );
    exception when others then
      raise exception 'row %: %', v_idx, sqlerrm;
    end;

    v_results := v_results || jsonb_build_object(
      'student_id', v_student_id,
      'surname', v_row->>'surname',
      'given_names', v_row->>'given_names'
    );
  end loop;

  return jsonb_build_object('inserted', v_results);
end;
$$;

grant execute on function import_students(uuid, jsonb) to authenticated;
