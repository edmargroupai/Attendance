"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

function readCredentials(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  return { email, password };
}

export async function signIn(formData: FormData) {
  const { email, password } = readCredentials(formData);
  const supabase = await createClient();

  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    redirect(`/login?error=${encodeURIComponent(error.message)}&mode=signin`);
  }

  redirect("/students");
}

export async function signUp(formData: FormData) {
  const { email, password } = readCredentials(formData);
  const supabase = await createClient();

  const { error } = await supabase.auth.signUp({ email, password });
  if (error) {
    redirect(`/login?error=${encodeURIComponent(error.message)}&mode=signup`);
  }

  redirect("/students");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
