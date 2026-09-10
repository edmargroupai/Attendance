"use client";

import { useMemo, useState } from "react";
import type { Mark } from "@/lib/attendance/rules";
import {
  isEnrolmentActiveOn,
  summarizePeriod,
  summarizeSession,
  type AttendanceEntry,
  type EnrolmentInfo,
  type OpenSlot,
} from "@/lib/attendance/summaries";
import { Cell } from "./Cell";

export type StudentRow = {
  enrolmentId: string;
  studentId: string;
  surname: string;
  givenNames: string;
  registerGroup: "Boy" | "Girl";
  startDate: string;
  endDate: string | null;
};

export type SessionColumn = {
  id: string;
  date: string;
  session: 1 | 2;
  isOpen: boolean;
  closureReason: string | null;
  revision: number;
};

export type CellRecord = {
  enrolmentId: string;
  calendarSessionId: string;
  status: Mark;
  revision: number;
};

type CellState = { status: Mark; revision: number };

function cellKey(enrolmentId: string, calendarSessionId: string): string {
  return `${enrolmentId}::${calendarSessionId}`;
}

const DAY_LETTERS = ["S", "M", "T", "W", "T", "F", "S"];

function dayLetter(date: string): string {
  const [y, m, d] = date.split("-").map(Number);
  return DAY_LETTERS[new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
}

function formatDate(date: string): string {
  const [, m, d] = date.split("-").map(Number);
  const monthNames = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
  ];
  return `${d} ${monthNames[m - 1]}`;
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export function RegisterGrid({
  students,
  columns,
  initialCells,
}: {
  classId: string;
  students: StudentRow[];
  columns: SessionColumn[];
  initialCells: CellRecord[];
}) {
  const [cells, setCells] = useState<Map<string, CellState>>(() => {
    const map = new Map<string, CellState>();
    for (const c of initialCells) {
      map.set(cellKey(c.enrolmentId, c.calendarSessionId), { status: c.status, revision: c.revision });
    }
    return map;
  });
  const [pending, setPending] = useState<Set<string>>(new Set());
  const [errors, setErrors] = useState<Map<string, string>>(new Map());
  const [markPresentDate, setMarkPresentDate] = useState(columns[0]?.date ?? "");
  const [markPresentSession, setMarkPresentSession] = useState<1 | 2>(1);
  const [markPresentConfirming, setMarkPresentConfirming] = useState(false);
  const [markPresentBusy, setMarkPresentBusy] = useState(false);

  const today = todayIso();
  const boys = useMemo(
    () => students.filter((s) => s.registerGroup === "Boy").sort(sortStudents),
    [students],
  );
  const girls = useMemo(
    () => students.filter((s) => s.registerGroup === "Girl").sort(sortStudents),
    [students],
  );

  const enrolmentInfos: EnrolmentInfo[] = useMemo(
    () =>
      students.map((s) => ({
        id: s.enrolmentId,
        registerGroup: s.registerGroup,
        startDate: s.startDate,
        endDate: s.endDate,
      })),
    [students],
  );

  const openSlots: OpenSlot[] = useMemo(
    () => columns.filter((c) => c.isOpen).map((c) => ({ date: c.date, session: c.session })),
    [columns],
  );

  const attendanceEntries: AttendanceEntry[] = useMemo(() => {
    const entries: AttendanceEntry[] = [];
    for (const col of columns) {
      for (const student of students) {
        const state = cells.get(cellKey(student.enrolmentId, col.id));
        entries.push({
          enrolmentId: student.enrolmentId,
          date: col.date,
          session: col.session,
          status: state?.status ?? null,
        });
      }
    }
    return entries;
  }, [columns, students, cells]);

  const periodTotals = useMemo(
    () => summarizePeriod(openSlots, enrolmentInfos, attendanceEntries),
    [openSlots, enrolmentInfos, attendanceEntries],
  );

  const sessionSummaries = useMemo(() => {
    const map = new Map<string, ReturnType<typeof summarizeSession>>();
    for (const col of columns) {
      map.set(col.id, summarizeSession(col.date, col.session, enrolmentInfos, attendanceEntries));
    }
    return map;
  }, [columns, enrolmentInfos, attendanceEntries]);

  const anyPending = pending.size > 0;
  const anyErrors = errors.size > 0;

  async function saveCell(enrolmentId: string, calendarSessionId: string, newStatus: Mark) {
    const key = cellKey(enrolmentId, calendarSessionId);
    const current = cells.get(key) ?? { status: null, revision: 0 };

    setPending((prev) => new Set(prev).add(key));
    setErrors((prev) => {
      const next = new Map(prev);
      next.delete(key);
      return next;
    });

    try {
      const res = await fetch("/api/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requestId: crypto.randomUUID(),
          updates: [
            {
              enrolmentId,
              calendarSessionId,
              status: newStatus,
              expectedRevision: current.revision,
            },
          ],
        }),
      });
      const body = await res.json().catch(() => ({}));

      if (res.status === 409 && body.conflicts?.length) {
        const conflict = body.conflicts[0];
        setCells((prev) => {
          const next = new Map(prev);
          next.set(key, { status: conflict.currentStatus, revision: conflict.currentRevision });
          return next;
        });
        setErrors((prev) => new Map(prev).set(key, "Changed elsewhere — showing latest value"));
        return;
      }
      if (!res.ok) {
        setErrors((prev) => new Map(prev).set(key, body.error ?? "Save failed"));
        return;
      }

      const updated = body.updates[0];
      setCells((prev) => {
        const next = new Map(prev);
        next.set(key, { status: updated.status, revision: updated.revision });
        return next;
      });
    } catch {
      setErrors((prev) => new Map(prev).set(key, "Network error — not saved"));
    } finally {
      setPending((prev) => {
        const next = new Set(prev);
        next.delete(key);
        return next;
      });
    }
  }

  const markPresentColumn = columns.find(
    (c) => c.date === markPresentDate && c.session === markPresentSession,
  );
  const markPresentTargets = markPresentColumn
    ? students.filter((s) => {
        if (!markPresentColumn.isOpen) return false;
        if (!isEnrolmentActiveOn(
          { id: s.enrolmentId, registerGroup: s.registerGroup, startDate: s.startDate, endDate: s.endDate },
          markPresentColumn.date,
        )) {
          return false;
        }
        const state = cells.get(cellKey(s.enrolmentId, markPresentColumn.id));
        return !state || state.status === null;
      })
    : [];

  async function applyMarkPresent() {
    if (!markPresentColumn || markPresentTargets.length === 0) return;
    setMarkPresentBusy(true);

    const requestId = crypto.randomUUID();
    const updates = markPresentTargets.map((s) => {
      const state = cells.get(cellKey(s.enrolmentId, markPresentColumn.id));
      return {
        enrolmentId: s.enrolmentId,
        calendarSessionId: markPresentColumn.id,
        status: "P" as const,
        expectedRevision: state?.revision ?? 0,
      };
    });

    try {
      const res = await fetch("/api/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestId, updates }),
      });
      const body = await res.json().catch(() => ({}));

      if (res.ok && body.status === "ok") {
        setCells((prev) => {
          const next = new Map(prev);
          for (const u of body.updates) {
            next.set(cellKey(u.enrolmentId, u.calendarSessionId), { status: u.status, revision: u.revision });
          }
          return next;
        });
      }
    } finally {
      setMarkPresentBusy(false);
      setMarkPresentConfirming(false);
    }
  }

  let rowCounter = 0;
  function nextRow() {
    return rowCounter++;
  }

  return (
    <div className="flex flex-1 flex-col gap-3 overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
        <div aria-live="polite">
          {anyPending ? (
            <span className="text-slate-600">Saving…</span>
          ) : anyErrors ? (
            <span className="text-red-700">{errors.size} cell(s) failed to save</span>
          ) : (
            <span className="text-slate-500">All changes saved</span>
          )}
        </div>

        <div className="flex items-end gap-2 rounded border border-slate-200 bg-slate-50 p-2">
          <div>
            <label className="block text-xs font-medium text-slate-600">Mark unmarked present</label>
            <div className="flex gap-1">
              <select
                value={markPresentDate}
                onChange={(e) => {
                  setMarkPresentDate(e.target.value);
                  setMarkPresentConfirming(false);
                }}
                className="rounded border border-slate-300 px-1 py-0.5 text-xs"
              >
                {[...new Set(columns.map((c) => c.date))].map((date) => (
                  <option key={date} value={date}>
                    {formatDate(date)}
                  </option>
                ))}
              </select>
              <select
                value={markPresentSession}
                onChange={(e) => {
                  setMarkPresentSession(Number(e.target.value) as 1 | 2);
                  setMarkPresentConfirming(false);
                }}
                className="rounded border border-slate-300 px-1 py-0.5 text-xs"
              >
                <option value={1}>Session 1</option>
                <option value={2}>Session 2</option>
              </select>
            </div>
          </div>
          {!markPresentConfirming ? (
            <button
              type="button"
              disabled={markPresentTargets.length === 0}
              onClick={() => setMarkPresentConfirming(true)}
              className="rounded border border-slate-300 px-2 py-1 text-xs text-slate-700 hover:bg-white disabled:opacity-50"
            >
              Preview ({markPresentTargets.length} blank)
            </button>
          ) : (
            <div className="flex items-center gap-2 text-xs">
              <span>Mark {markPresentTargets.length} blank cell(s) present?</span>
              <button
                type="button"
                disabled={markPresentBusy}
                onClick={applyMarkPresent}
                className="rounded bg-slate-900 px-2 py-1 text-white disabled:opacity-50"
              >
                Confirm
              </button>
              <button
                type="button"
                onClick={() => setMarkPresentConfirming(false)}
                className="rounded border border-slate-300 px-2 py-1 text-slate-700"
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-auto rounded border border-slate-200">
        <table className="border-collapse text-sm">
          <thead>
            <tr>
              <th
                rowSpan={3}
                className="sticky left-0 top-0 z-30 w-10 border border-slate-200 bg-slate-100 text-xs"
              >
                #
              </th>
              <th
                rowSpan={3}
                className="sticky left-10 top-0 z-30 w-52 border border-slate-200 bg-slate-100 text-left text-xs"
              >
                Name
              </th>
              {columns.map((col) => (
                <th
                  key={`date-${col.id}`}
                  colSpan={1}
                  className="sticky top-0 z-20 border border-slate-200 bg-slate-100 px-1 text-xs font-medium"
                  title={col.closureReason ?? undefined}
                >
                  {formatDate(col.date)}
                  {!col.isOpen ? " (closed)" : ""}
                </th>
              ))}
            </tr>
            <tr>
              {columns.map((col) => (
                <th
                  key={`day-${col.id}`}
                  className="sticky top-8 z-20 border border-slate-200 bg-slate-100 text-xs font-medium"
                >
                  {dayLetter(col.date)}
                </th>
              ))}
            </tr>
            <tr>
              {columns.map((col) => (
                <th
                  key={`sess-${col.id}`}
                  className="sticky top-16 z-20 w-11 border border-slate-200 bg-slate-100 text-xs font-medium"
                >
                  {col.session}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <GroupHeaderRow label="BOYS" colSpan={columns.length + 2} />
            {boys.map((student, i) => (
              <StudentRowLine
                key={student.enrolmentId}
                number={i + 1}
                student={student}
                columns={columns}
                cells={cells}
                pending={pending}
                errors={errors}
                today={today}
                rowIndex={nextRow()}
                onSetStatus={saveCell}
              />
            ))}
            <SubtotalRow label="Boys" columns={columns} summaries={sessionSummaries} group="boys" />

            <GroupHeaderRow label="GIRLS" colSpan={columns.length + 2} />
            {girls.map((student, i) => (
              <StudentRowLine
                key={student.enrolmentId}
                number={i + 1}
                student={student}
                columns={columns}
                cells={cells}
                pending={pending}
                errors={errors}
                today={today}
                rowIndex={nextRow()}
                onSetStatus={saveCell}
              />
            ))}
            <SubtotalRow label="Girls" columns={columns} summaries={sessionSummaries} group="girls" />
            <SubtotalRow label="Combined" columns={columns} summaries={sessionSummaries} group="combined" bold />
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap gap-4 text-xs text-slate-600">
        <span>Scheduled sessions: {periodTotals.scheduledClassSessions}</span>
        <span>Possible student-sessions: {periodTotals.possibleStudentSessions}</span>
        <span>Attended student-sessions: {periodTotals.attendedStudentSessions}</span>
        <span>
          Completion: {periodTotals.completion === null ? "N/A" : `${periodTotals.completion}%`}
        </span>
        <span>
          Attendance:{" "}
          {periodTotals.attendancePercentage === null
            ? "N/A"
            : `${periodTotals.attendancePercentage}% (provisional until fully marked)`}
        </span>
        <span>
          P={periodTotals.statusTotals.P} L={periodTotals.statusTotals.L} A={periodTotals.statusTotals.A}{" "}
          Ex={periodTotals.statusTotals.Ex} Unmarked={periodTotals.statusTotals.Unmarked}
        </span>
      </div>
    </div>
  );
}

function sortStudents(a: StudentRow, b: StudentRow): number {
  const bySurname = a.surname.localeCompare(b.surname, undefined, { sensitivity: "base" });
  if (bySurname !== 0) return bySurname;
  return a.givenNames.localeCompare(b.givenNames, undefined, { sensitivity: "base" });
}

function GroupHeaderRow({ label, colSpan }: { label: string; colSpan: number }) {
  return (
    <tr>
      <th
        colSpan={colSpan}
        className="sticky left-0 z-10 border border-slate-200 bg-slate-200 px-2 py-1 text-left text-xs font-bold uppercase tracking-wide"
      >
        {label}
      </th>
    </tr>
  );
}

function StudentRowLine({
  number,
  student,
  columns,
  cells,
  pending,
  errors,
  today,
  rowIndex,
  onSetStatus,
}: {
  number: number;
  student: StudentRow;
  columns: SessionColumn[];
  cells: Map<string, CellState>;
  pending: Set<string>;
  errors: Map<string, string>;
  today: string;
  rowIndex: number;
  onSetStatus: (enrolmentId: string, calendarSessionId: string, status: Mark) => void;
}) {
  return (
    <tr>
      <td className="sticky left-0 z-10 border border-slate-200 bg-white px-1 text-center text-xs text-slate-500">
        {number}
      </td>
      <td className="sticky left-10 z-10 border border-slate-200 bg-white px-2 text-xs">
        {student.surname}, {student.givenNames}
      </td>
      {columns.map((col, colIndex) => {
        const isActive = isEnrolmentActiveOn(
          { id: student.enrolmentId, registerGroup: student.registerGroup, startDate: student.startDate, endDate: student.endDate },
          col.date,
        );
        const disabled = !col.isOpen || !isActive || col.date > today;
        const disabledReason = !col.isOpen
          ? col.closureReason ?? "Closed"
          : !isActive
            ? "Not enrolled on this date"
            : col.date > today
              ? "Future date"
              : undefined;
        const key = `${student.enrolmentId}::${col.id}`;
        const state = cells.get(key);

        return (
          <td key={col.id} className="border border-slate-200 p-0">
            <Cell
              coord={`${rowIndex}-${colIndex}`}
              disabled={disabled}
              disabledReason={disabledReason}
              status={state?.status ?? null}
              pending={pending.has(key)}
              error={errors.get(key)}
              ariaLabel={`${student.surname}, ${student.givenNames} — ${col.date} session ${col.session} — ${state?.status ?? "blank"}`}
              onSetStatus={(mark) => onSetStatus(student.enrolmentId, col.id, mark)}
            />
          </td>
        );
      })}
    </tr>
  );
}

function SubtotalRow({
  label,
  columns,
  summaries,
  group,
  bold,
}: {
  label: string;
  columns: SessionColumn[];
  summaries: Map<string, ReturnType<typeof summarizeSession>>;
  group: "boys" | "girls" | "combined";
  bold?: boolean;
}) {
  return (
    <tr className={bold ? "font-semibold" : ""}>
      <td className="sticky left-0 z-10 border border-slate-200 bg-slate-50" />
      <td className="sticky left-10 z-10 border border-slate-200 bg-slate-50 px-2 text-xs">
        {label} subtotal
      </td>
      {columns.map((col) => {
        const summary = summaries.get(col.id);
        const value = summary ? summary[group].attendanceTotal : 0;
        return (
          <td
            key={col.id}
            className="border border-slate-200 bg-slate-50 text-center text-xs text-slate-700"
          >
            {value}
          </td>
        );
      })}
    </tr>
  );
}
