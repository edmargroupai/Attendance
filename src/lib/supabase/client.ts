"use client";

import { createBrowserClient } from "@supabase/ssr";
import { getSupabasePublishableKey, getSupabaseUrl } from "./env";
import type { Database } from "./database.types";

export function createClient() {
  return createBrowserClient<Database>(getSupabaseUrl(), getSupabasePublishableKey());
}
