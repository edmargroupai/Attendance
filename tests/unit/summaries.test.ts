import { describe, expect, it } from "vitest";
import {
  eligibleSlotsFor,
  isEnrolmentActiveOn,
  summarizePeriod,
  summarizeSession,
  type AttendanceEntry,
  type EnrolmentInfo,
  type OpenSlot,
} from "@/lib/attendance/summaries";

// Spec section 9 "Hand-calculated integration fixture": two open full
// days, four students (two boys, two girls) enrolled for both dates.
// Every number below is copied verbatim from the spec table/prose, so
// this test is a direct reproduction of the spec's own worked example,
// not just an invented case.
const DAY1 = "2026-09-01";
const DAY2 = "2026-09-02";

const slots: OpenSlot[] = [
  { date: DAY1, session: 1 },
  { date: DAY1, session: 2 },
  { date: DAY2, session: 1 },
  { date: DAY2, session: 2 },
];

const enrolments: EnrolmentInfo[] = [
  { id: "brown", registerGroup: "Boy", startDate: DAY1, endDate: null },
  { id: "edwards", registerGroup: "Boy", startDate: DAY1, endDate: null },
  { id: "adams", registerGroup: "Girl", startDate: DAY1, endDate: null },
  { id: "williams", registerGroup: "Girl", startDate: DAY1, endDate: null },
];

const marks: AttendanceEntry[] = [
  // Brown, Adam (Boy): L/P, P/P -> 3 attended
  { enrolmentId: "brown", date: DAY1, session: 1, status: "L" },
  { enrolmentId: "brown", date: DAY1, session: 2, status: "P" },
  { enrolmentId: "brown", date: DAY2, session: 1, status: "P" },
  { enrolmentId: "brown", date: DAY2, session: 2, status: "P" },
  // Edwards, Daniel (Boy): P/A, A/L -> 2 attended
  { enrolmentId: "edwards", date: DAY1, session: 1, status: "P" },
  { enrolmentId: "edwards", date: DAY1, session: 2, status: "A" },
  { enrolmentId: "edwards", date: DAY2, session: 1, status: "A" },
  { enrolmentId: "edwards", date: DAY2, session: 2, status: "L" },
  // Adams, Alicia (Girl): P/P, Ex/P -> 3 attended
  { enrolmentId: "adams", date: DAY1, session: 1, status: "P" },
  { enrolmentId: "adams", date: DAY1, session: 2, status: "P" },
  { enrolmentId: "adams", date: DAY2, session: 1, status: "Ex" },
  { enrolmentId: "adams", date: DAY2, session: 2, status: "P" },
  // Williams, Brianna (Girl): A/Ex, L/P -> 1 attended
  { enrolmentId: "williams", date: DAY1, session: 1, status: "A" },
  { enrolmentId: "williams", date: DAY1, session: 2, status: "Ex" },
  { enrolmentId: "williams", date: DAY2, session: 1, status: "L" },
  { enrolmentId: "williams", date: DAY2, session: 2, status: "P" },
];

describe("summarizePeriod — spec section 9 fixture", () => {
  const totals = summarizePeriod(slots, enrolments, marks);

  it("scheduled class sessions = 4 (two full days)", () => {
    expect(totals.scheduledClassSessions).toBe(4);
  });

  it("possible student-sessions = 16 (4 students x 4 slots)", () => {
    expect(totals.possibleStudentSessions).toBe(16);
  });

  it("period attended totals: boys 5, girls 4, combined 9", () => {
    expect(totals.boysAttended.total).toBe(5);
    expect(totals.girlsAttended.total).toBe(4);
    expect(totals.combinedAttended.total).toBe(9);
    expect(totals.attendedStudentSessions).toBe(9);
  });

  it("morning 3, afternoon 6", () => {
    expect(totals.combinedAttended.morning).toBe(3);
    expect(totals.combinedAttended.afternoon).toBe(6);
  });

  it("completion 100% (every eligible slot was marked)", () => {
    expect(totals.completion).toBe(100);
  });

  it("attendance 56.3% (9/16 rounded to one decimal)", () => {
    expect(totals.attendancePercentage).toBe(56.3);
  });

  it("original marks: P=8, L=3, A=3, Ex=2 (status totals, not credits)", () => {
    expect(totals.statusTotals).toEqual({ P: 8, L: 3, A: 3, Ex: 2, Unmarked: 0 });
  });
});

describe("summarizeSession — spec section 9 fixture, per-day breakdown", () => {
  it("Day 1: boys 1 morning/1 afternoon; girls 1/1; combined 2/2", () => {
    const morning = summarizeSession(DAY1, 1, enrolments, marks);
    const afternoon = summarizeSession(DAY1, 2, enrolments, marks);
    expect(morning.boys.attendanceTotal).toBe(1);
    expect(morning.girls.attendanceTotal).toBe(1);
    expect(morning.combined.attendanceTotal).toBe(2);
    expect(afternoon.boys.attendanceTotal).toBe(1);
    expect(afternoon.girls.attendanceTotal).toBe(1);
    expect(afternoon.combined.attendanceTotal).toBe(2);
  });

  it("Day 2: boys 1/2; girls 0/2; combined 1/4", () => {
    const morning = summarizeSession(DAY2, 1, enrolments, marks);
    const afternoon = summarizeSession(DAY2, 2, enrolments, marks);
    expect(morning.boys.attendanceTotal).toBe(1);
    expect(morning.girls.attendanceTotal).toBe(0);
    expect(morning.combined.attendanceTotal).toBe(1);
    expect(afternoon.boys.attendanceTotal).toBe(2);
    expect(afternoon.girls.attendanceTotal).toBe(2);
    expect(afternoon.combined.attendanceTotal).toBe(4);
  });
});

describe("boundary cases (spec section 9 'Additional essential tests')", () => {
  it("blank remains incomplete: a null mark counts as Unmarked, not Absent", () => {
    const partialMarks = marks.filter((m) => !(m.enrolmentId === "brown" && m.date === DAY2));
    const totals = summarizePeriod(slots, enrolments, partialMarks);
    expect(totals.statusTotals.Unmarked).toBe(2);
    expect(totals.statusTotals.A).toBe(3); // unchanged - blank is not counted as absent
    expect(totals.completion).toBeLessThan(100);
  });

  it("a date outside an enrolment's window contributes neither possible nor attended credit", () => {
    const lateArrival: EnrolmentInfo = { id: "late", registerGroup: "Boy", startDate: DAY2, endDate: null };
    expect(isEnrolmentActiveOn(lateArrival, DAY1)).toBe(false);
    expect(eligibleSlotsFor(lateArrival, slots)).toEqual([
      { date: DAY2, session: 1 },
      { date: DAY2, session: 2 },
    ]);
    const withMarkOnIneligibleDay: AttendanceEntry[] = [
      { enrolmentId: "late", date: DAY1, session: 1, status: "P" }, // should be ignored - ineligible
      { enrolmentId: "late", date: DAY2, session: 1, status: "P" },
    ];
    const totals = summarizePeriod(slots, [lateArrival], withMarkOnIneligibleDay);
    expect(totals.possibleStudentSessions).toBe(2); // only DAY2's two slots
    expect(totals.attendedStudentSessions).toBe(1); // only the DAY2 mark counts
  });

  it("a withdrawal end date is inclusive", () => {
    const withdrawn: EnrolmentInfo = { id: "w", registerGroup: "Girl", startDate: DAY1, endDate: DAY1 };
    expect(isEnrolmentActiveOn(withdrawn, DAY1)).toBe(true);
    expect(isEnrolmentActiveOn(withdrawn, DAY2)).toBe(false);
  });

  it("an empty class (no enrolments) does not divide by zero", () => {
    const totals = summarizePeriod(slots, [], []);
    expect(totals.possibleStudentSessions).toBe(0);
    expect(totals.completion).toBeNull();
    expect(totals.attendancePercentage).toBeNull();
  });

  it("a month with no open sessions does not divide by zero", () => {
    const totals = summarizePeriod([], enrolments, []);
    expect(totals.scheduledClassSessions).toBe(0);
    expect(totals.possibleStudentSessions).toBe(0);
    expect(totals.completion).toBeNull();
    expect(totals.attendancePercentage).toBeNull();
  });

  it("twenty full school days yield 40 scheduled sessions; one afternoon closure reduces this to 39", () => {
    const fullMonth: OpenSlot[] = [];
    for (let day = 1; day <= 20; day++) {
      const date = `2026-10-${String(day).padStart(2, "0")}`;
      fullMonth.push({ date, session: 1 }, { date, session: 2 });
    }
    expect(summarizePeriod(fullMonth, [], []).scheduledClassSessions).toBe(40);

    const withOneClosure = fullMonth.filter((s) => !(s.date === "2026-10-10" && s.session === 2));
    expect(summarizePeriod(withOneClosure, [], []).scheduledClassSessions).toBe(39);
  });
});
