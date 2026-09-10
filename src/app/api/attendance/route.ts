import { NextResponse } from "next/server";

// Stage 6 implements the atomic mark-update command here, per
// docs/EdMar_Attendance_Blueprint_and_Cursor_Build_Spec.md section 7
// (access, save integrity and command contracts).
export async function POST() {
  return NextResponse.json({ error: "Not implemented" }, { status: 501 });
}
