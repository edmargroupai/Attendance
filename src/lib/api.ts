import { NextResponse } from "next/server";
import { createClient } from "./supabase/server";

// Shared by every src/app/api/* route: loads the cookie-authenticated
// Supabase client and the current user. RLS still enforces ownership at
// the database layer - this just avoids every route repeating the same
// unauthenticated-request check.
export async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  return { supabase, user };
}

export function errorResponse(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}
