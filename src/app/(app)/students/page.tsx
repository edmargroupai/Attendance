import { createClient } from "@/lib/supabase/server";
import { AddStudentForm } from "./AddStudentForm";
import { ImportPanel } from "./ImportPanel";
import { AsOfDatePicker } from "./AsOfDatePicker";
import { Roster, type RosterEntry } from "./Roster";

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function sortRoster(a: RosterEntry, b: RosterEntry): number {
  const bySurname = a.surname.localeCompare(b.surname, undefined, { sensitivity: "base" });
  if (bySurname !== 0) return bySurname;
  return a.given_names.localeCompare(b.given_names, undefined, { sensitivity: "base" });
}

export default async function StudentsPage({
  searchParams,
}: {
  searchParams: Promise<{ classId?: string; asOf?: string }>;
}) {
  const { classId, asOf: asOfParam } = await searchParams;
  const asOf = asOfParam ?? todayIso();
  const supabase = await createClient();

  const { data: classes } = await supabase
    .from("classes")
    .select("*")
    .is("archived_at", null)
    .order("name");

  if (!classes || classes.length === 0) {
    return (
      <main className="p-8">
        <h1 className="text-xl font-semibold text-slate-900">Students</h1>
        <p className="mt-2 text-sm text-slate-600">
          You need a class before you can add students.{" "}
          <a href="/calendar" className="underline">
            Create one on the Calendar page.
          </a>
        </p>
      </main>
    );
  }

  const selectedClassId = classId ?? classes[0].id;

  const { data: enrolments } = await supabase
    .from("enrolments")
    .select("id, student_id, register_group, start_date, end_date, students(surname, given_names, admission_number)")
    .eq("class_id", selectedClassId)
    .lte("start_date", asOf)
    .or(`end_date.is.null,end_date.gte.${asOf}`);

  const roster: RosterEntry[] = (enrolments ?? [])
    .filter((e) => e.students)
    .map((e) => ({
      enrolmentId: e.id,
      studentId: e.student_id,
      surname: e.students!.surname,
      given_names: e.students!.given_names,
      admission_number: e.students!.admission_number,
      register_group: e.register_group,
      start_date: e.start_date,
      end_date: e.end_date,
    }))
    .sort(sortRoster);

  const boys = roster.filter((r) => r.register_group === "Boy");
  const girls = roster.filter((r) => r.register_group === "Girl");

  return (
    <main className="space-y-8 p-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Students</h1>
          <div className="mt-1 flex flex-wrap gap-2 text-sm">
            {classes.map((klass) => (
              <a
                key={klass.id}
                href={`/students?classId=${klass.id}&asOf=${asOf}`}
                className={
                  klass.id === selectedClassId
                    ? "rounded bg-slate-900 px-2 py-1 text-white"
                    : "rounded border border-slate-300 px-2 py-1 text-slate-700"
                }
              >
                {klass.name}
              </a>
            ))}
          </div>
        </div>
        <AsOfDatePicker classId={selectedClassId} asOf={asOf} />
      </div>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
          Add a student
        </h2>
        <AddStudentForm classId={selectedClassId} />
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
          Import students
        </h2>
        <ImportPanel
          classId={selectedClassId}
          existingRoster={roster.map((r) => ({ surname: r.surname, given_names: r.given_names }))}
        />
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
          Roster as of {asOf}
        </h2>
        <Roster boys={boys} girls={girls} />
      </section>
    </main>
  );
}
