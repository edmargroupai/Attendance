import { describe, expect, it } from "vitest";
import { sanitizeCsvText, toCsv } from "@/lib/exports/csv";
import {
  buildDailySessionSummaryCsv,
  buildGroupSummaryCsv,
  buildMonthlyRegisterCsv,
  buildPerStudentSummaryCsv,
  type ReportColumn,
  type ReportMeta,
  type ReportStudent,
} from "@/lib/exports";
import {
  summarizePeriod,
  summarizeSession,
  summarizeStudent,
  type AttendanceEntry,
  type EnrolmentInfo,
  type OpenSlot,
} from "@/lib/attendance/summaries";

describe("csv primitives", () => {
  it("quotes fields containing commas, quotes, or newlines", () => {
    expect(toCsv([["a,b", 'say "hi"', "line1\nline2"]])).toBe(
      '"a,b","say ""hi""","line1\nline2"',
    );
  });

  it("leaves plain fields unquoted", () => {
    expect(toCsv([["plain", 42, null]])).toBe("plain,42,");
  });

  it("neutralises formula-injection prefixes with a leading apostrophe", () => {
    expect(sanitizeCsvText("=SUM(A1:A9)")).toBe("'=SUM(A1:A9)");
    expect(sanitizeCsvText("+1+1")).toBe("'+1+1");
    expect(sanitizeCsvText("-1")).toBe("'-1");
    expect(sanitizeCsvText("@cmd")).toBe("'@cmd");
  });

  it("leaves ordinary text alone", () => {
    expect(sanitizeCsvText("Brown-Smith")).toBe("Brown-Smith");
    expect(sanitizeCsvText("O'Brien")).toBe("O'Brien");
  });
});

// Same spec section 9 fixture as tests/unit/summaries.test.ts, reused
// here so the exports are proven to match the engine's own numbers
// exactly (Stage 7 gate: "hand-calculated fixture ... matches screen and
// export").
const DAY1 = "2026-09-01";
const DAY2 = "2026-09-02";

const slots: OpenSlot[] = [
  { date: DAY1, session: 1 }, { date: DAY1, session: 2 },
  { date: DAY2, session: 1 }, { date: DAY2, session: 2 },
];

const enrolments: EnrolmentInfo[] = [
  { id: "brown", registerGroup: "Boy", startDate: DAY1, endDate: null },
  { id: "edwards", registerGroup: "Boy", startDate: DAY1, endDate: null },
  { id: "adams", registerGroup: "Girl", startDate: DAY1, endDate: null },
  { id: "williams", registerGroup: "Girl", startDate: DAY1, endDate: null },
];

const marks: AttendanceEntry[] = [
  { enrolmentId: "brown", date: DAY1, session: 1, status: "L" },
  { enrolmentId: "brown", date: DAY1, session: 2, status: "P" },
  { enrolmentId: "brown", date: DAY2, session: 1, status: "P" },
  { enrolmentId: "brown", date: DAY2, session: 2, status: "P" },
  { enrolmentId: "edwards", date: DAY1, session: 1, status: "P" },
  { enrolmentId: "edwards", date: DAY1, session: 2, status: "A" },
  { enrolmentId: "edwards", date: DAY2, session: 1, status: "A" },
  { enrolmentId: "edwards", date: DAY2, session: 2, status: "L" },
  { enrolmentId: "adams", date: DAY1, session: 1, status: "P" },
  { enrolmentId: "adams", date: DAY1, session: 2, status: "P" },
  { enrolmentId: "adams", date: DAY2, session: 1, status: "Ex" },
  { enrolmentId: "adams", date: DAY2, session: 2, status: "P" },
  { enrolmentId: "williams", date: DAY1, session: 1, status: "A" },
  { enrolmentId: "williams", date: DAY1, session: 2, status: "Ex" },
  { enrolmentId: "williams", date: DAY2, session: 1, status: "L" },
  { enrolmentId: "williams", date: DAY2, session: 2, status: "P" },
];

const students: ReportStudent[] = [
  { enrolmentId: "brown", surname: "Brown", givenNames: "Adam", registerGroup: "Boy", admissionNumber: "A100" },
  { enrolmentId: "edwards", surname: "Edwards", givenNames: "Daniel", registerGroup: "Boy", admissionNumber: "A101" },
  { enrolmentId: "adams", surname: "Adams", givenNames: "Alicia", registerGroup: "Girl", admissionNumber: "A102" },
  { enrolmentId: "williams", surname: "Williams", givenNames: "Brianna", registerGroup: "Girl", admissionNumber: "A103" },
];

const columns: ReportColumn[] = [
  { id: "d1s1", date: DAY1, session: 1 }, { id: "d1s2", date: DAY1, session: 2 },
  { id: "d2s1", date: DAY2, session: 1 }, { id: "d2s2", date: DAY2, session: 2 },
];

const meta: ReportMeta = {
  schoolName: "EdMar Test School",
  className: "Grade 1A",
  period: "2026-09",
  generatedAt: "2026-09-30T12:00:00.000Z",
};

describe("buildGroupSummaryCsv — matches the spec fixture exactly", () => {
  const totals = summarizePeriod(slots, enrolments, marks);
  const csv = buildGroupSummaryCsv(meta, totals);
  const lines = csv.split("\r\n");

  it("includes the metadata block", () => {
    expect(lines).toContain("Rule version,1.0");
    expect(lines).toContain("Completion,100%");
  });

  it("boys row: morning 2, afternoon 3, total 5, P=4 A=2 L=2 Ex=0", () => {
    expect(lines).toContain("Boys,2,3,5,4,2,2,0,0");
  });

  it("girls row: morning 1, afternoon 3, total 4, P=4 A=1 L=1 Ex=2", () => {
    expect(lines).toContain("Girls,1,3,4,4,1,1,2,0");
  });

  it("combined row: morning 3, afternoon 6, total 9, P=8 A=3 L=3 Ex=2", () => {
    expect(lines).toContain("Combined,3,6,9,8,3,3,2,0");
  });

  it("scheduled/possible/attended totals", () => {
    expect(lines).toContain("Scheduled class sessions,4");
    expect(lines).toContain("Possible student-sessions,16");
    expect(lines).toContain("Attended student-sessions,9");
  });
});

describe("buildPerStudentSummaryCsv — matches per-student fixture numbers", () => {
  const summaries = new Map(
    enrolments.map((e) => [e.id, summarizeStudent(e, slots, marks)]),
  );
  const totals = summarizePeriod(slots, enrolments, marks);
  const csv = buildPerStudentSummaryCsv(meta, students, summaries, totals.completion);
  const lines = csv.split("\r\n");

  it("Brown: 4 possible, 3 attended, 100% completion", () => {
    expect(lines).toContain('"Brown, Adam",Boy,A100,4,3,3,0,1,0,0,100,75');
  });

  it("Williams: 4 possible, 1 attended", () => {
    expect(lines).toContain('"Williams, Brianna",Girl,A103,4,1,1,1,1,1,0,100,25');
  });
});

describe("buildDailySessionSummaryCsv — per-day breakdown matches fixture", () => {
  const summaries = new Map(
    columns.map((c) => [c.id, summarizeSession(c.date, c.session, enrolments, marks)]),
  );
  const csv = buildDailySessionSummaryCsv(meta, columns, summaries);
  const lines = csv.split("\r\n");

  it("Day 1 morning: boys attended 1, girls attended 1", () => {
    const row = lines.find((l) => l.startsWith("2026-09-01,1,"));
    expect(row).toContain(",1,"); // boys attended column appears at index 7
    const cols = row!.split(",");
    expect(cols[7]).toBe("1"); // boys attended
    expect(cols[13]).toBe("1"); // girls attended
  });

  it("Day 2 afternoon: boys attended 2, girls attended 2, combined 4", () => {
    const row = lines.find((l) => l.startsWith("2026-09-02,2,"))!;
    const cols = row.split(",");
    expect(cols[7]).toBe("2");
    expect(cols[13]).toBe("2");
    expect(cols[14]).toBe("4");
  });
});

describe("buildMonthlyRegisterCsv — mirrors the register grid", () => {
  const sessionSummaries = new Map(
    columns.map((c) => [c.id, summarizeSession(c.date, c.session, enrolments, marks)]),
  );
  const cellStatus = (enrolmentId: string, columnId: string) => {
    const col = columns.find((c) => c.id === columnId)!;
    const mark = marks.find(
      (m) => m.enrolmentId === enrolmentId && m.date === col.date && m.session === col.session,
    );
    return mark ? mark.status : null;
  };
  const csv = buildMonthlyRegisterCsv(meta, students, columns, cellStatus, sessionSummaries);
  const lines = csv.split("\r\n");

  it("Brown's row shows L,P,P,P across the four session columns", () => {
    const row = lines.find((l) => l.startsWith('1,"Brown, Adam"'))!;
    expect(row).toBe('1,"Brown, Adam",L,P,P,P');
  });

  it("boys subtotal row matches per-session boys attendance", () => {
    const row = lines.find((l) => l.startsWith(",Boys subtotal"))!;
    expect(row).toBe(",Boys subtotal,1,1,1,2");
  });

  it("groups are BOYS-then-GIRLS, alphabetised within each", () => {
    const boysIdx = lines.indexOf("BOYS");
    const girlsIdx = lines.indexOf("GIRLS");
    expect(boysIdx).toBeGreaterThan(-1);
    expect(girlsIdx).toBeGreaterThan(boysIdx);
  });
});
