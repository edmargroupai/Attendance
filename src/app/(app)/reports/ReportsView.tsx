"use client";

import { useMemo, useState } from "react";
import { ATTENDANCE_RULE_VERSION, type Mark } from "@/lib/attendance/rules";
import {
  summarizePeriod,
  summarizeSession,
  summarizeStudent,
  type AttendanceEntry,
  type EnrolmentInfo,
} from "@/lib/attendance/summaries";
import {
  buildDailySessionSummaryCsv,
  buildGroupSummaryCsv,
  buildMonthlyRegisterCsv,
  buildPerStudentSummaryCsv,
  type ReportMeta,
  type ReportStudent,
} from "@/lib/exports";

export type ReportEnrolment = {
  enrolmentId: string;
  surname: string;
  givenNames: string;
  admissionNumber: string | null;
  registerGroup: "Boy" | "Girl";
  startDate: string;
  endDate: string | null;
};

export type ReportSessionColumn = {
  id: string;
  date: string;
  session: 1 | 2;
};

function downloadCsv(filename: string, csv: string) {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function sortStudents(a: ReportEnrolment, b: ReportEnrolment): number {
  const bySurname = a.surname.localeCompare(b.surname, undefined, { sensitivity: "base" });
  if (bySurname !== 0) return bySurname;
  return a.givenNames.localeCompare(b.givenNames, undefined, { sensitivity: "base" });
}

function formatDate(date: string): string {
  const [, m, d] = date.split("-").map(Number);
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${d} ${monthNames[m - 1]}`;
}

export function ReportsView({
  meta,
  enrolments,
  columns,
  marks,
}: {
  meta: Omit<ReportMeta, "generatedAt">;
  enrolments: ReportEnrolment[];
  columns: ReportSessionColumn[];
  marks: { enrolmentId: string; date: string; session: 1 | 2; status: Mark }[];
}) {
  const [generatedAt] = useState(() => new Date().toISOString());

  const enrolmentInfos: EnrolmentInfo[] = useMemo(
    () => enrolments.map((e) => ({ id: e.enrolmentId, registerGroup: e.registerGroup, startDate: e.startDate, endDate: e.endDate })),
    [enrolments],
  );
  const openSlots = useMemo(() => columns.map((c) => ({ date: c.date, session: c.session })), [columns]);
  const attendanceEntries: AttendanceEntry[] = marks;

  const periodTotals = useMemo(
    () => summarizePeriod(openSlots, enrolmentInfos, attendanceEntries),
    [openSlots, enrolmentInfos, attendanceEntries],
  );

  const studentSummaries = useMemo(() => {
    const map = new Map(enrolmentInfos.map((e) => [e.id, summarizeStudent(e, openSlots, attendanceEntries)]));
    return map;
  }, [enrolmentInfos, openSlots, attendanceEntries]);

  const sessionSummaries = useMemo(() => {
    const map = new Map(
      columns.map((c) => [c.id, summarizeSession(c.date, c.session, enrolmentInfos, attendanceEntries)]),
    );
    return map;
  }, [columns, enrolmentInfos, attendanceEntries]);

  const cellStatus = useMemo(() => {
    const lookup = new Map<string, Mark>();
    for (const m of marks) {
      const col = columns.find((c) => c.date === m.date && c.session === m.session);
      if (col) lookup.set(`${m.enrolmentId}::${col.id}`, m.status);
    }
    return (enrolmentId: string, columnId: string) => lookup.get(`${enrolmentId}::${columnId}`) ?? null;
  }, [marks, columns]);

  const reportMeta: ReportMeta = { ...meta, generatedAt };
  const reportStudents: ReportStudent[] = enrolments.map((e) => ({
    enrolmentId: e.enrolmentId,
    surname: e.surname,
    givenNames: e.givenNames,
    registerGroup: e.registerGroup,
    admissionNumber: e.admissionNumber,
  }));

  const boys = useMemo(() => enrolments.filter((e) => e.registerGroup === "Boy").sort(sortStudents), [enrolments]);
  const girls = useMemo(() => enrolments.filter((e) => e.registerGroup === "Girl").sort(sortStudents), [enrolments]);

  function download(kind: "register" | "student" | "group" | "daily") {
    const filenameBase = `${meta.className}-${meta.period}`.replace(/[^a-z0-9-]+/gi, "_");
    if (kind === "register") {
      downloadCsv(`${filenameBase}-register.csv`, buildMonthlyRegisterCsv(reportMeta, reportStudents, columns, cellStatus, sessionSummaries));
    } else if (kind === "student") {
      downloadCsv(`${filenameBase}-per-student.csv`, buildPerStudentSummaryCsv(reportMeta, reportStudents, studentSummaries, periodTotals.completion));
    } else if (kind === "group") {
      downloadCsv(`${filenameBase}-group-summary.csv`, buildGroupSummaryCsv(reportMeta, periodTotals));
    } else {
      downloadCsv(`${filenameBase}-daily-summary.csv`, buildDailySessionSummaryCsv(reportMeta, columns, sessionSummaries));
    }
  }

  return (
    <div className="space-y-6">
      <section className="space-y-1 text-sm text-slate-600 print:text-black">
        <p>
          <strong>{meta.schoolName ?? "—"}</strong> · {meta.className} · {meta.period}
        </p>
        <p>
          Generated {new Date(generatedAt).toLocaleString()} · Rule version {ATTENDANCE_RULE_VERSION} · Completion{" "}
          {periodTotals.completion === null ? "N/A" : `${periodTotals.completion}%`}
        </p>
        <p>P=Present A=Absent L=Late Ex=Excused (blank = unmarked, not absent).</p>
        <p>Morning counts P only. Afternoon counts P or L.</p>
      </section>

      <section className="flex flex-wrap gap-2 print:hidden">
        <button type="button" onClick={() => download("register")} className="rounded border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-50">
          Export monthly register (CSV)
        </button>
        <button type="button" onClick={() => download("student")} className="rounded border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-50">
          Export per-student summary (CSV)
        </button>
        <button type="button" onClick={() => download("group")} className="rounded border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-50">
          Export boys/girls/combined summary (CSV)
        </button>
        <button type="button" onClick={() => download("daily")} className="rounded border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-50">
          Export daily session summary (CSV)
        </button>
        <button type="button" onClick={() => window.print()} className="rounded bg-slate-900 px-3 py-1.5 text-sm text-white hover:bg-slate-800">
          Print / Save as PDF
        </button>
      </section>

      <section>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
          Boys / Girls / Combined summary
        </h2>
        {columns.length === 0 ? (
          <p className="text-sm text-slate-500">No open sessions this period — 0 scheduled sessions, N/A.</p>
        ) : (
          <table className="mt-2 text-sm">
            <thead>
              <tr className="text-left text-xs uppercase text-slate-500">
                <th className="py-1 pr-4">Group</th>
                <th className="py-1 pr-4">Morning</th>
                <th className="py-1 pr-4">Afternoon</th>
                <th className="py-1 pr-4">Total attended</th>
                <th className="py-1 pr-4">P</th>
                <th className="py-1 pr-4">A</th>
                <th className="py-1 pr-4">L</th>
                <th className="py-1 pr-4">Ex</th>
              </tr>
            </thead>
            <tbody>
              {(
                [
                  ["Boys", periodTotals.boysAttended, periodTotals.boysStatusTotals],
                  ["Girls", periodTotals.girlsAttended, periodTotals.girlsStatusTotals],
                  ["Combined", periodTotals.combinedAttended, periodTotals.statusTotals],
                ] as const
              ).map(([label, attended, status]) => (
                <tr key={label} className="border-t border-slate-100">
                  <td className="py-1 pr-4 font-medium">{label}</td>
                  <td className="py-1 pr-4">{attended.morning}</td>
                  <td className="py-1 pr-4">{attended.afternoon}</td>
                  <td className="py-1 pr-4">{attended.total}</td>
                  <td className="py-1 pr-4">{status.P}</td>
                  <td className="py-1 pr-4">{status.A}</td>
                  <td className="py-1 pr-4">{status.L}</td>
                  <td className="py-1 pr-4">{status.Ex}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <p className="mt-2 text-xs text-slate-500">
          Scheduled class sessions: {periodTotals.scheduledClassSessions} · Possible student-sessions:{" "}
          {periodTotals.possibleStudentSessions} · Attended student-sessions: {periodTotals.attendedStudentSessions}
        </p>
      </section>

      <section>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Per-student summary</h2>
        <table className="mt-2 text-sm">
          <thead>
            <tr className="text-left text-xs uppercase text-slate-500">
              <th className="py-1 pr-4">Name</th>
              <th className="py-1 pr-4">Group</th>
              <th className="py-1 pr-4">Possible</th>
              <th className="py-1 pr-4">Attended</th>
              <th className="py-1 pr-4">Completion</th>
              <th className="py-1 pr-4">Attendance</th>
            </tr>
          </thead>
          <tbody>
            {[...boys, ...girls].map((e) => {
              const s = studentSummaries.get(e.enrolmentId);
              return (
                <tr key={e.enrolmentId} className="border-t border-slate-100">
                  <td className="py-1 pr-4">{e.surname}, {e.givenNames}</td>
                  <td className="py-1 pr-4">{e.registerGroup}</td>
                  <td className="py-1 pr-4">{s?.possibleSessions ?? 0}</td>
                  <td className="py-1 pr-4">{s?.attendedSessions ?? 0}</td>
                  <td className="py-1 pr-4">{s?.completion === null || s?.completion === undefined ? "N/A" : `${s.completion}%`}</td>
                  <td className="py-1 pr-4">
                    {s?.attendancePercentage === null || s?.attendancePercentage === undefined
                      ? "N/A"
                      : `${s.attendancePercentage}%`}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>

      <PrintableRegister
        students={[...boys, ...girls]}
        columns={columns}
        cellStatus={cellStatus}
        sessionSummaries={sessionSummaries}
      />
    </div>
  );
}

// Spec section 8: printable landscape register with repeated headers and
// horizontal page segmentation by week (browser Print/Save-as-PDF is
// sufficient - no PDF service needed). Chunking by week keeps each page
// legible instead of squeezing a whole month into one illegible page.
function PrintableRegister({
  students,
  columns,
  cellStatus,
  sessionSummaries,
}: {
  students: ReportEnrolment[];
  columns: ReportSessionColumn[];
  cellStatus: (enrolmentId: string, columnId: string) => Mark;
  sessionSummaries: Map<string, ReturnType<typeof summarizeSession>>;
}) {
  const weeks: ReportSessionColumn[][] = [];
  const dates = [...new Set(columns.map((c) => c.date))];
  for (let i = 0; i < dates.length; i += 7) {
    const weekDates = new Set(dates.slice(i, i + 7));
    weeks.push(columns.filter((c) => weekDates.has(c.date)));
  }

  return (
    <section className="hidden print:block">
      {weeks.map((weekColumns, weekIndex) => (
        <table
          key={weekIndex}
          className="w-full border-collapse text-xs"
          style={{ pageBreakAfter: weekIndex < weeks.length - 1 ? "always" : "auto" }}
        >
          <thead>
            <tr>
              <th className="border border-black px-1">#</th>
              <th className="border border-black px-1 text-left">Name</th>
              {weekColumns.map((col) => (
                <th key={col.id} className="border border-black px-1">
                  {formatDate(col.date)} S{col.session}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {students.map((s, i) => (
              <tr key={s.enrolmentId}>
                <td className="border border-black px-1 text-center">{i + 1}</td>
                <td className="border border-black px-1">
                  {s.surname}, {s.givenNames}
                </td>
                {weekColumns.map((col) => (
                  <td key={col.id} className="border border-black px-1 text-center">
                    {cellStatus(s.enrolmentId, col.id) ?? ""}
                  </td>
                ))}
              </tr>
            ))}
            <tr>
              <td className="border border-black px-1" colSpan={2}>
                Combined
              </td>
              {weekColumns.map((col) => (
                <td key={col.id} className="border border-black px-1 text-center">
                  {sessionSummaries.get(col.id)?.combined.attendanceTotal ?? 0}
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      ))}
    </section>
  );
}
