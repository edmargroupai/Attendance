import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { ensureTeacherSettings } from "@/lib/teacher-settings";
import { signOut } from "@/app/(auth)/login/actions";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  await ensureTeacherSettings(supabase, user.id);

  return (
    <div className="flex flex-1 flex-col">
      <header className="flex items-center justify-between border-b border-slate-200 px-6 py-3 print:hidden">
        <div className="flex items-center gap-6">
          <span className="text-sm font-semibold text-slate-900">
            EdMar Attendance Register
          </span>
          <nav className="flex gap-4 text-sm text-slate-600">
            <Link href="/students" className="hover:text-slate-900">
              Students
            </Link>
            <Link href="/calendar" className="hover:text-slate-900">
              Calendar
            </Link>
            <Link href="/reports" className="hover:text-slate-900">
              Reports
            </Link>
          </nav>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-slate-500">{user.email}</span>
          <form action={signOut}>
            <button
              type="submit"
              className="rounded border border-slate-300 px-3 py-1 text-sm text-slate-700 hover:bg-slate-50"
            >
              Sign out
            </button>
          </form>
        </div>
      </header>
      <div className="flex-1">{children}</div>
    </div>
  );
}
