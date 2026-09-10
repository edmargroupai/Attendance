import { ATTENDANCE_RULE_VERSION, type Mark } from "@/lib/attendance/rules";
import type { DailySessionSummary, PeriodTotals, StudentSummary } from "@/lib/attendance/summaries";
import { sanitizeCsvText, toCsv, type CsvCell } from "./csv";

export interface ReportMeta {
  schoolName: string | null;
  className: string;
  period: string;
  generatedAt: string;
}

export interface ReportStudent {
  enrolmentId: string;
  surname: string;
  givenNames: string;
  registerGroup: "Boy" | "Girl";
  admissionNumber: string | null;
}

export interface ReportColumn {
  id: string;
  date: string;
  session: 1 | 2;
}

// Every export starts with the same metadata block (spec section 8:
// "Every report states school/class, period, generation time, rule
// version and completion status. Include the P/A/L/Ex legend and
// morning P-only rule.").
function metaRows(meta: ReportMeta, completion: number | null): CsvCell[][] {
  return [
    ["School", sanitizeCsvText(meta.schoolName ?? "")],
    ["Class", sanitizeCsvText(meta.className)],
    ["Period", meta.period],
    ["Generated", meta.generatedAt],
    ["Rule version", ATTENDANCE_RULE_VERSION],
    ["Completion", completion === null ? "N/A" : `${completion}%`],
    ["Legend", "P=Present A=Absent L=Late Ex=Excused (blank=unmarked, not absent)"],
    ["Rule", "Morning counts P only. Afternoon counts P or L."],
    [],
  ];
}

function studentLabel(s: ReportStudent): string {
  return `${sanitizeCsvText(s.surname)}, ${sanitizeCsvText(s.givenNames)}`;
}

function columnLabel(col: ReportColumn): string {
  const [, m, d] = col.date.split("-");
  return `${d}/${m} S${col.session}`;
}

function sortStudents(a: ReportStudent, b: ReportStudent): number {
  const bySurname = a.surname.localeCompare(b.surname, undefined, { sensitivity: "base" });
  if (bySurname !== 0) return bySurname;
  return a.givenNames.localeCompare(b.givenNames, undefined, { sensitivity: "base" });
}

// "Monthly register" export (spec section 8) - mirrors exactly what the
// on-screen grid shows: BOYS then GIRLS, each alphabetised, one row per
// student, one column per session, plus subtotal/combined rows. Marks
// come from the confirmed `cellStatus` lookup only, so this always
// matches the saved register, never unconfirmed edits (spec: "Exports
// must match the saved register, not unconfirmed edits").
export function buildMonthlyRegisterCsv(
  meta: ReportMeta,
  students: ReportStudent[],
  columns: ReportColumn[],
  cellStatus: (enrolmentId: string, columnId: string) => Mark,
  sessionSummaries: Map<string, DailySessionSummary>,
): string {
  const boys = students.filter((s) => s.registerGroup === "Boy").sort(sortStudents);
  const girls = students.filter((s) => s.registerGroup === "Girl").sort(sortStudents);

  const header: CsvCell[] = ["#", "Name", ...columns.map(columnLabel)];

  function studentRows(group: ReportStudent[]): CsvCell[][] {
    return group.map((s, i) => [
      i + 1,
      studentLabel(s),
      ...columns.map((col) => cellStatus(s.enrolmentId, col.id) ?? ""),
    ]);
  }

  function subtotalRow(label: string, key: "boys" | "girls" | "combined"): CsvCell[] {
    return ["", label, ...columns.map((col) => sessionSummaries.get(col.id)?.[key].attendanceTotal ?? 0)];
  }

  const rows: CsvCell[][] = [
    ...metaRows(meta, null),
    header,
    ["BOYS"],
    ...studentRows(boys),
    subtotalRow("Boys subtotal", "boys"),
    ["GIRLS"],
    ...studentRows(girls),
    subtotalRow("Girls subtotal", "girls"),
    subtotalRow("Combined", "combined"),
  ];

  return toCsv(rows);
}

// "Per-student monthly summary" export (spec section 8).
export function buildPerStudentSummaryCsv(
  meta: ReportMeta,
  students: ReportStudent[],
  summaries: Map<string, StudentSummary>,
  periodCompletion: number | null,
): string {
  const sorted = [...students].sort((a, b) => {
    if (a.registerGroup !== b.registerGroup) return a.registerGroup === "Boy" ? -1 : 1;
    return sortStudents(a, b);
  });

  const header: CsvCell[] = [
    "Name", "Group", "Admission #", "Possible sessions", "Attended sessions",
    "P", "A", "L", "Ex", "Unmarked", "Completion %", "Attendance %",
  ];

  const rows: CsvCell[][] = students.length
    ? sorted.map((s) => {
        const summary = summaries.get(s.enrolmentId);
        return [
          studentLabel(s),
          s.registerGroup,
          sanitizeCsvText(s.admissionNumber ?? ""),
          summary?.possibleSessions ?? 0,
          summary?.attendedSessions ?? 0,
          summary?.statusTotals.P ?? 0,
          summary?.statusTotals.A ?? 0,
          summary?.statusTotals.L ?? 0,
          summary?.statusTotals.Ex ?? 0,
          summary?.statusTotals.Unmarked ?? 0,
          summary?.completion === null || summary?.completion === undefined ? "N/A" : summary.completion,
          summary?.attendancePercentage === null || summary?.attendancePercentage === undefined
            ? "N/A"
            : summary.attendancePercentage,
        ];
      })
    : [];

  return toCsv([...metaRows(meta, periodCompletion), header, ...rows]);
}

// "Boys/girls/combined monthly summary" export (spec section 8).
export function buildGroupSummaryCsv(meta: ReportMeta, totals: PeriodTotals): string {
  const header: CsvCell[] = [
    "Group", "Morning attended", "Afternoon attended", "Total attended",
    "P", "A", "L", "Ex", "Unmarked",
  ];

  const rows: CsvCell[][] = [
    ["Boys", totals.boysAttended.morning, totals.boysAttended.afternoon, totals.boysAttended.total,
      totals.boysStatusTotals.P, totals.boysStatusTotals.A, totals.boysStatusTotals.L,
      totals.boysStatusTotals.Ex, totals.boysStatusTotals.Unmarked],
    ["Girls", totals.girlsAttended.morning, totals.girlsAttended.afternoon, totals.girlsAttended.total,
      totals.girlsStatusTotals.P, totals.girlsStatusTotals.A, totals.girlsStatusTotals.L,
      totals.girlsStatusTotals.Ex, totals.girlsStatusTotals.Unmarked],
    ["Combined", totals.combinedAttended.morning, totals.combinedAttended.afternoon, totals.combinedAttended.total,
      totals.statusTotals.P, totals.statusTotals.A, totals.statusTotals.L,
      totals.statusTotals.Ex, totals.statusTotals.Unmarked],
  ];

  const summaryRows: CsvCell[][] = [
    [],
    ["Scheduled class sessions", totals.scheduledClassSessions],
    ["Possible student-sessions", totals.possibleStudentSessions],
    ["Attended student-sessions", totals.attendedStudentSessions],
  ];

  return toCsv([...metaRows(meta, totals.completion), header, ...rows, ...summaryRows]);
}

// "Daily session summary" export (spec section 8). Reports must display
// scheduled sessions separately from attended student-sessions, and show
// zero/N-A rather than error when there are none - handled by the caller
// passing an empty `columns`/`summaries` when no open sessions exist.
export function buildDailySessionSummaryCsv(
  meta: ReportMeta,
  columns: ReportColumn[],
  summaries: Map<string, DailySessionSummary>,
): string {
  const header: CsvCell[] = [
    "Date", "Session",
    "Boys P", "Boys A", "Boys L", "Boys Ex", "Boys Unmarked", "Boys attended",
    "Girls P", "Girls A", "Girls L", "Girls Ex", "Girls Unmarked", "Girls attended",
    "Combined attended",
  ];

  const rows: CsvCell[][] = columns.map((col) => {
    const s = summaries.get(col.id);
    const empty = { P: 0, A: 0, L: 0, Ex: 0, Unmarked: 0 };
    const boys = s?.boys.status ?? empty;
    const girls = s?.girls.status ?? empty;
    return [
      col.date, col.session,
      boys.P, boys.A, boys.L, boys.Ex, boys.Unmarked, s?.boys.attendanceTotal ?? 0,
      girls.P, girls.A, girls.L, girls.Ex, girls.Unmarked, s?.girls.attendanceTotal ?? 0,
      s?.combined.attendanceTotal ?? 0,
    ];
  });

  return toCsv([...metaRows(meta, null), header, ...rows]);
}
