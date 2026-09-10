import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./supabase/database.types";

// Every owner-scoped table assumes a session, but nothing provisions a
// teacher_settings row on signup. Called once per authenticated page
// load (see src/app/(app)/layout.tsx) so a row always exists by the time
// other pages need it (e.g. for the timezone/school name).
export async function ensureTeacherSettings(
  supabase: SupabaseClient<Database>,
  ownerId: string,
) {
  const { error } = await supabase
    .from("teacher_settings")
    .upsert({ owner_id: ownerId }, { onConflict: "owner_id", ignoreDuplicates: true });

  if (error) {
    throw error;
  }
}
