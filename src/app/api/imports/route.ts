import { NextResponse } from "next/server";

// Stage 3 implements the transactional student import command here, per
// docs/EdMar_Attendance_Blueprint_and_Cursor_Build_Spec.md section 4
// (Student creation) and section 7 (command contracts).
export async function POST() {
  return NextResponse.json({ error: "Not implemented" }, { status: 501 });
}
