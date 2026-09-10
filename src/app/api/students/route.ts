import { NextResponse } from "next/server";
import { errorResponse, requireUser } from "@/lib/api";

// Typed single-entry add. Reuses import_students (Stage-3 migration) with
// a 1-row array so there's one code path for both entry methods.
export async function POST(request: Request) {
  const auth = await requireUser();
  if (!auth) return errorResponse("Not authenticated", 401);

  const body = await request.json();
  const { classId, admission_number, surname, given_names, register_group, start_date, end_date } =
    body ?? {};

  if (!classId || !surname || !given_names || !register_group || !start_date) {
    return errorResponse("classId, surname, given_names, register_group, and start_date are required");
  }

  const { data, error } = await auth.supabase.rpc("import_students", {
    p_class_id: classId,
    p_rows: [
      {
        admission_number: admission_number || null,
        surname,
        given_names,
        register_group,
        start_date,
        end_date: end_date || null,
      },
    ],
  });

  if (error) return errorResponse(error.message, 400);
  return NextResponse.json({ result: data }, { status: 201 });
}
