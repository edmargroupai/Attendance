import { NextResponse } from "next/server";
import { errorResponse, requireUser } from "@/lib/api";
import { MAX_IMPORT_ROWS, type ImportRow } from "@/lib/imports";

// Body rows are already validated client-side (src/lib/imports) before
// this is called; the server still re-checks the row-count cap and lets
// import_students (Stage-3 migration) do the transactional insert -
// duplicate admission numbers / overlapping enrolments / bad values are
// caught there too, so a malformed row can't partially commit.
export async function POST(request: Request) {
  const auth = await requireUser();
  if (!auth) return errorResponse("Not authenticated", 401);

  const body = await request.json();
  const { classId, rows } = body ?? {};

  if (!classId || !Array.isArray(rows)) {
    return errorResponse("classId and rows[] are required");
  }
  if (rows.length === 0) {
    return errorResponse("rows[] must not be empty");
  }
  if (rows.length > MAX_IMPORT_ROWS) {
    return errorResponse(`cannot import more than ${MAX_IMPORT_ROWS} rows at once`);
  }

  const p_rows = (rows as ImportRow[]).map((row) => ({
    admission_number: row.admission_number || null,
    surname: row.surname,
    given_names: row.given_names,
    register_group: row.register_group,
    start_date: row.start_date,
    end_date: row.end_date || null,
  }));

  const { data, error } = await auth.supabase.rpc("import_students", {
    p_class_id: classId,
    p_rows,
  });

  if (error) return errorResponse(error.message, 400);
  return NextResponse.json({ result: data }, { status: 201 });
}
