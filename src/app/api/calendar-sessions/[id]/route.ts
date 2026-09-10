import { NextResponse } from "next/server";
import { errorResponse, requireUser } from "@/lib/api";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireUser();
  if (!auth) return errorResponse("Not authenticated", 401);

  const { id } = await params;
  const body = await request.json();
  const { is_open, closure_reason } = body ?? {};

  if (typeof is_open !== "boolean") {
    return errorResponse("is_open (boolean) is required");
  }
  if (!is_open && !closure_reason) {
    return errorResponse("closure_reason is required when closing a session");
  }

  // Spec section 4: calendar changes affecting already-marked slots must
  // be blocked pending review. No register UI exists yet (Stage 5), so
  // this count is always 0 today, but the guard is in place from here on.
  const { count, error: countError } = await auth.supabase
    .from("attendance_records")
    .select("id", { count: "exact", head: true })
    .eq("calendar_session_id", id)
    .not("status", "is", null);

  if (countError) return errorResponse(countError.message, 400);
  if (!is_open && count && count > 0) {
    return errorResponse(
      `cannot close: ${count} attendance record(s) already marked for this session`,
      409,
    );
  }

  const { data, error } = await auth.supabase
    .from("calendar_sessions")
    .update({ is_open, closure_reason: is_open ? null : closure_reason })
    .eq("id", id)
    .select("*")
    .single();

  if (error) return errorResponse(error.message, 400);
  return NextResponse.json({ calendarSession: data });
}
