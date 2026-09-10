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
      <header className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-slate-200 px-3 py-3 sm:px-6 print:hidden">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
          <span className="text-sm font-semibold text-slate-900">
            EdMar Attendance Register
          </span>
          <nav aria-label="Main" className="flex flex-wrap gap-4 text-sm text-slate-600">
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
        <div className="flex items-center gap-3">
          <span className="hidden max-w-40 truncate text-sm text-slate-500 sm:inline">
            {user.email}
          </span>
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
