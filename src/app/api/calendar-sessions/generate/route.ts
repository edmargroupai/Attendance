import { NextResponse } from "next/server";
import { errorResponse, requireUser } from "@/lib/api";
import { generateOpenDates } from "@/lib/calendar";

export async function POST(request: Request) {
  const auth = await requireUser();
  if (!auth) return errorResponse("Not authenticated", 401);

  const body = await request.json();
  const { classId } = body ?? {};
  if (!classId) return errorResponse("classId is required");

  const { data: classRow, error: classError } = await auth.supabase
    .from("classes")
    .select("id, monday, tuesday, wednesday, thursday, friday, saturday, academic_year_id")
    .eq("id", classId)
    .single();

  if (classError || !classRow) return errorResponse("class not found", 404);

  const { data: yearRow, error: yearError } = await auth.supabase
    .from("academic_years")
    .select("start_date, end_date")
    .eq("id", classRow.academic_year_id)
    .single();

  if (yearError || !yearRow) return errorResponse("academic year not found", 404);

  const dates = generateOpenDates(yearRow.start_date, yearRow.end_date, {
    monday: classRow.monday,
    tuesday: classRow.tuesday,
    wednesday: classRow.wednesday,
    thursday: classRow.thursday,
    friday: classRow.friday,
    saturday: classRow.saturday,
  });

  const rows = dates.flatMap((date) => [
    { class_id: classId, date, session: 1 as const },
    { class_id: classId, date, session: 2 as const },
  ]);

  // Idempotent: re-running skips dates already generated (unique
  // constraint on (class_id, date, session) from the Stage-2 migration).
  const { error: insertError } = await auth.supabase
    .from("calendar_sessions")
    .upsert(rows, { onConflict: "class_id,date,session", ignoreDuplicates: true });

  if (insertError) return errorResponse(insertError.message, 400);

  return NextResponse.json({ generatedDates: dates.length });
}
