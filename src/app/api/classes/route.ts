import { NextResponse } from "next/server";
import { errorResponse, requireUser } from "@/lib/api";

export async function GET() {
  const auth = await requireUser();
  if (!auth) return errorResponse("Not authenticated", 401);

  const { data, error } = await auth.supabase
    .from("classes")
    .select("*")
    .is("archived_at", null)
    .order("name", { ascending: true });

  if (error) return errorResponse(error.message, 400);
  return NextResponse.json({ classes: data });
}

export async function POST(request: Request) {
  const auth = await requireUser();
  if (!auth) return errorResponse("Not authenticated", 401);

  const body = await request.json();
  const { name, academic_year_id, monday, tuesday, wednesday, thursday, friday, saturday } =
    body ?? {};

  if (!name || !academic_year_id) {
    return errorResponse("name and academic_year_id are required");
  }

  const { data, error } = await auth.supabase
    .from("classes")
    .insert({
      name,
      academic_year_id,
      monday: monday ?? true,
      tuesday: tuesday ?? true,
      wednesday: wednesday ?? true,
      thursday: thursday ?? true,
      friday: friday ?? true,
      saturday: saturday ?? false,
    })
    .select("*")
    .single();

  if (error) return errorResponse(error.message, 400);
  return NextResponse.json({ class: data }, { status: 201 });
}
