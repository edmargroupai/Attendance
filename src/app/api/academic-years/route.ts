import { NextResponse } from "next/server";
import { errorResponse, requireUser } from "@/lib/api";

export async function GET() {
  const auth = await requireUser();
  if (!auth) return errorResponse("Not authenticated", 401);

  const { data, error } = await auth.supabase
    .from("academic_years")
    .select("*")
    .order("start_date", { ascending: false });

  if (error) return errorResponse(error.message, 400);
  return NextResponse.json({ academicYears: data });
}

export async function POST(request: Request) {
  const auth = await requireUser();
  if (!auth) return errorResponse("Not authenticated", 401);

  const body = await request.json();
  const { label, start_date, end_date } = body ?? {};

  if (!label || !start_date || !end_date) {
    return errorResponse("label, start_date, and end_date are required");
  }

  const { data, error } = await auth.supabase
    .from("academic_years")
    .insert({ label, start_date, end_date })
    .select("*")
    .single();

  if (error) return errorResponse(error.message, 400);
  return NextResponse.json({ academicYear: data }, { status: 201 });
}
