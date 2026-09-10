import { createClient } from "@/lib/supabase/server";
import { ReportsView, type ReportEnrolment, type ReportSessionColumn } from "./ReportsView";
import { ClassPicker } from "./ClassPicker";

function currentMonth(): string {
  return new Date().toISOString().slice(0, 7);
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

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ classId?: string; month?: string }>;
}) {
  const { classId, month: monthParam } = await searchParams;
  const month = monthParam ?? currentMonth();
  const { start, end } = monthBounds(month);
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: classes }, { data: teacherSettings }] = await Promise.all([
    supabase.from("classes").select("id, name").is("archived_at", null).order("name"),
    supabase.from("teacher_settings").select("school_name").eq("owner_id", user!.id).maybeSingle(),
  ]);

  if (!classes || classes.length === 0) {
    return (
      <main className="p-8">
        <h1 className="text-xl font-semibold text-slate-900">Reports</h1>
        <p className="mt-2 text-sm text-slate-600">
          You need a class first.{" "}
          <a href="/calendar" className="underline">
            Create one on the Calendar page.
          </a>
        </p>
      </main>
    );
  }

  const selectedClassId = classId ?? classes[0].id;
  const selectedClass = classes.find((c) => c.id === selectedClassId) ?? classes[0];

  const [{ data: enrolments }, { data: sessions }] = await Promise.all([
    supabase
      .from("enrolments")
      .select("id, register_group, start_date, end_date, students(surname, given_names, admission_number)")
      .eq("class_id", selectedClassId)
      .lte("start_date", end)
      .or(`end_date.is.null,end_date.gte.${start}`),
    supabase
      .from("calendar_sessions")
      .select("id, date, session, is_open")
      .eq("class_id", selectedClassId)
      .eq("is_open", true)
      .gte("date", start)
      .lte("date", end)
      .order("date", { ascending: true })
      .order("session", { ascending: true }),
  ]);

  const sessionIds = (sessions ?? []).map((s) => s.id);
  const { data: attendanceRows } =
    sessionIds.length > 0
      ? await supabase
          .from("attendance_records")
          .select("enrolment_id, calendar_session_id, status")
          .in("calendar_session_id", sessionIds)
      : { data: [] };

  const columns: ReportSessionColumn[] = (sessions ?? []).map((s) => ({
    id: s.id,
    date: s.date,
    session: s.session as 1 | 2,
  }));

  const reportEnrolments: ReportEnrolment[] = (enrolments ?? [])
    .filter((e) => e.students)
    .map((e) => ({
      enrolmentId: e.id,
      surname: e.students!.surname,
      givenNames: e.students!.given_names,
      admissionNumber: e.students!.admission_number,
      registerGroup: e.register_group,
      startDate: e.start_date,
      endDate: e.end_date,
    }));

  const marks = (attendanceRows ?? []).map((a) => {
    const col = columns.find((c) => c.id === a.calendar_session_id)!;
    return {
      enrolmentId: a.enrolment_id,
      date: col.date,
      session: col.session,
      status: a.status,
    };
  });

  return (
    <main className="flex flex-col gap-4 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2 print:hidden">
        <h1 className="text-xl font-semibold text-slate-900">Reports</h1>
        <div className="flex items-center gap-2 text-sm">
          <ClassPicker classes={classes} selectedClassId={selectedClassId} month={month} />
          <a
            href={`/reports?classId=${selectedClassId}&month=${shiftMonth(month, -1)}`}
            className="rounded border border-slate-300 px-2 py-1 hover:bg-slate-50"
          >
            ← Prev
          </a>
          <span className="font-medium">{month}</span>
          <a
            href={`/reports?classId=${selectedClassId}&month=${shiftMonth(month, 1)}`}
            className="rounded border border-slate-300 px-2 py-1 hover:bg-slate-50"
          >
            Next →
          </a>
        </div>
      </div>

      <ReportsView
        meta={{
          schoolName: teacherSettings?.school_name ?? null,
          className: selectedClass.name,
          period: month,
        }}
        enrolments={reportEnrolments}
        columns={columns}
        marks={marks}
      />
    </main>
  );
}
