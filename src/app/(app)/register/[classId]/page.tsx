import { createClient } from "@/lib/supabase/server";
import { RegisterGrid, type CellRecord, type SessionColumn, type StudentRow } from "./RegisterGrid";

function currentMonth(): string {
  return new Date().toISOString().slice(0, 7); // YYYY-MM
}

function monthBounds(month: string): { start: string; end: string } {
  const [year, m] = month.split("-").map(Number);
  const start = `${month}-01`;
  const lastDay = new Date(Date.UTC(year, m, 0)).getUTCDate();
  const end = `${month}-${String(lastDay).padStart(2, "0")}`;
  return { start, end };
}

function shiftMonth(month: string, delta: number): string {
  const [year, m] = month.split("-").map(Number);
  const date = new Date(Date.UTC(year, m - 1 + delta, 1));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

export default async function RegisterPage({
  params,
  searchParams,
}: {
  params: Promise<{ classId: string }>;
  searchParams: Promise<{ month?: string }>;
}) {
  const { classId } = await params;
  const { month: monthParam } = await searchParams;
  const month = monthParam ?? currentMonth();
  const { start, end } = monthBounds(month);

  const supabase = await createClient();

  const [{ data: klass }, { data: enrolments }, { data: sessions }] = await Promise.all([
    supabase.from("classes").select("id, name").eq("id", classId).single(),
    supabase
      .from("enrolments")
      .select("id, student_id, register_group, start_date, end_date, students(surname, given_names)")
      .eq("class_id", classId)
      .lte("start_date", end)
      .or(`end_date.is.null,end_date.gte.${start}`),
    supabase
      .from("calendar_sessions")
      .select("id, date, session, is_open, closure_reason, revision")
      .eq("class_id", classId)
      .gte("date", start)
      .lte("date", end)
      .order("date", { ascending: true })
      .order("session", { ascending: true }),
  ]);

  if (!klass) {
    return (
      <main className="p-8">
        <h1 className="text-xl font-semibold text-slate-900">Register</h1>
        <p className="mt-2 text-sm text-slate-600">Class not found.</p>
      </main>
    );
  }

  const sessionIds = (sessions ?? []).map((s) => s.id);
  const { data: attendanceRows } =
    sessionIds.length > 0
      ? await supabase
          .from("attendance_records")
          .select("enrolment_id, calendar_session_id, status, revision")
          .in("calendar_session_id", sessionIds)
      : { data: [] };

  const students: StudentRow[] = (enrolments ?? [])
    .filter((e) => e.students)
    .map((e) => ({
      enrolmentId: e.id,
      studentId: e.student_id,
      surname: e.students!.surname,
      givenNames: e.students!.given_names,
      registerGroup: e.register_group,
      startDate: e.start_date,
      endDate: e.end_date,
    }));

  const columns: SessionColumn[] = (sessions ?? []).map((s) => ({
    id: s.id,
    date: s.date,
    session: s.session as 1 | 2,
    isOpen: s.is_open,
    closureReason: s.closure_reason,
    revision: s.revision,
  }));

  const cells: CellRecord[] = (attendanceRows ?? []).map((a) => ({
    enrolmentId: a.enrolment_id,
    calendarSessionId: a.calendar_session_id,
    status: a.status,
    revision: a.revision,
  }));

  return (
    <main className="flex h-[calc(100vh-3.5rem)] flex-col p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-semibold text-slate-900">{klass.name} — Register</h1>
        <nav className="flex items-center gap-2 text-sm">
          <a
            href={`/register/${classId}?month=${shiftMonth(month, -1)}`}
            className="rounded border border-slate-300 px-2 py-1 text-slate-700 hover:bg-slate-50"
          >
            ← Prev
          </a>
          <span className="font-medium text-slate-700">{month}</span>
          <a
            href={`/register/${classId}?month=${shiftMonth(month, 1)}`}
            className="rounded border border-slate-300 px-2 py-1 text-slate-700 hover:bg-slate-50"
          >
            Next →
          </a>
        </nav>
      </div>

      {columns.length === 0 ? (
        <p className="text-sm text-slate-600">
          No sessions generated for this month yet.{" "}
          <a href="/calendar" className="underline">
            Generate them on the Calendar page.
          </a>
        </p>
      ) : (
        <RegisterGrid
          classId={classId}
          students={students}
          columns={columns}
          initialCells={cells}
        />
      )}
    </main>
  );
}
