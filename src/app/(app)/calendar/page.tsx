import { createClient } from "@/lib/supabase/server";
import { CreateAcademicYearForm } from "./CreateAcademicYearForm";
import { CreateClassForm } from "./CreateClassForm";
import { ClassList } from "./ClassList";

export default async function CalendarPage() {
  const supabase = await createClient();

  const [{ data: academicYears }, { data: classes }] = await Promise.all([
    supabase.from("academic_years").select("*").order("start_date", { ascending: false }),
    supabase.from("classes").select("*").is("archived_at", null).order("name"),
  ]);

  return (
    <main className="space-y-8 p-8">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Calendar</h1>
        <p className="mt-1 text-sm text-slate-600">
          Set up an academic year and classes, then generate open morning/afternoon
          sessions and manage closures.
        </p>
      </div>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
          Academic years
        </h2>
        <CreateAcademicYearForm />
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
          Classes
        </h2>
        <CreateClassForm academicYears={academicYears ?? []} />
        <ClassList classes={classes ?? []} academicYears={academicYears ?? []} />
      </section>
    </main>
  );
}
