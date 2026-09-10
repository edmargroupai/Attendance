import { NextResponse } from "next/server";

// Stage 3 implements class CRUD here, per
// docs/EdMar_Attendance_Blueprint_and_Cursor_Build_Spec.md section 6
// (data model) and section 7 (command contracts).
export async function GET() {
  return NextResponse.json({ error: "Not implemented" }, { status: 501 });
}
