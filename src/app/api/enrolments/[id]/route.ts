import { NextResponse } from "next/server";
import { errorResponse, requireUser } from "@/lib/api";

// Withdrawal: sets end_date. A new arrival is just a fresh enrolment row
// (POST /api/students or /api/imports) - both paths are already governed
// by the Stage-2 enrolments_dates_ordered check and overlap exclusion
// constraint, so no extra validation is needed here.
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireUser();
  if (!auth) return errorResponse("Not authenticated", 401);

  const { id } = await params;
  const body = await request.json();
  const { end_date } = body ?? {};

  if (!end_date) {
    return errorResponse("end_date is required");
  }

  const { data, error } = await auth.supabase
    .from("enrolments")
    .update({ end_date })
    .eq("id", id)
    .select("*")
    .single();

  if (error) return errorResponse(error.message, 400);
  return NextResponse.json({ enrolment: data });
}
