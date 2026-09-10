import { attendanceCredit, type Mark, type Session } from "./rules";

// Spec section 2 — daily/monthly definitions. Every function here is a
// pure function of already-fetched data: callers are responsible for
// only passing OPEN calendar slots (closed slots "do not contribute to
// current totals") and for scoping the date range (a "month" is just a
// period whose slots happen to span one calendar month).

export interface OpenSlot {
  date: string; // YYYY-MM-DD
  session: Session;
}

export interface EnrolmentInfo {
  id: string;
  registerGroup: "Boy" | "Girl";
  startDate: string;
  endDate: string | null; // inclusive, per spec section 2
}

export interface AttendanceEntry {
  enrolmentId: string;
  date: string;
  session: Session;
  status: Mark;
}

export interface StatusCounts {
  P: number;
  A: number;
  L: number;
  Ex: number;
  Unmarked: number;
}

function emptyStatusCounts(): StatusCounts {
  return { P: 0, A: 0, L: 0, Ex: 0, Unmarked: 0 };
}

function addStatusCounts(a: StatusCounts, b: StatusCounts): StatusCounts {
  return { P: a.P + b.P, A: a.A + b.A, L: a.L + b.L, Ex: a.Ex + b.Ex, Unmarked: a.Unmarked + b.Unmarked };
}

// Enrolment start/end dates are inclusive (spec section 2 and 6).
export function isEnrolmentActiveOn(enrolment: EnrolmentInfo, date: string): boolean {
  if (date < enrolment.startDate) return false;
  if (enrolment.endDate !== null && date > enrolment.endDate) return false;
  return true;
}

// Only slots the caller has already filtered to open ones, within the
// enrolment's active window.
export function eligibleSlotsFor(enrolment: EnrolmentInfo, slots: OpenSlot[]): OpenSlot[] {
  return slots.filter((s) => isEnrolmentActiveOn(enrolment, s.date));
}

function findMark(
  marks: AttendanceEntry[],
  enrolmentId: string,
  date: string,
  session: Session,
): Mark {
  const found = marks.find(
    (m) => m.enrolmentId === enrolmentId && m.date === date && m.session === session,
  );
  return found ? found.status : null;
}

export interface SessionGroupSummary {
  status: StatusCounts;
  attendanceTotal: number;
}

export interface DailySessionSummary {
  date: string;
  session: Session;
  boys: SessionGroupSummary;
  girls: SessionGroupSummary;
  combined: SessionGroupSummary;
}

// Daily boys'/girls'/combined figures for one session slot. Only
// enrolments active on `date` are counted (spec: "Count only enrolments
// active on that date").
export function summarizeSession(
  date: string,
  session: Session,
  enrolments: EnrolmentInfo[],
  marks: AttendanceEntry[],
): DailySessionSummary {
  const boys = emptyStatusCounts();
  const girls = emptyStatusCounts();
  let boysAttendance = 0;
  let girlsAttendance = 0;

  for (const enrolment of enrolments) {
    if (!isEnrolmentActiveOn(enrolment, date)) continue;

    const status = findMark(marks, enrolment.id, date, session);
    const bucket = enrolment.registerGroup === "Boy" ? boys : girls;
    if (status === null) {
      bucket.Unmarked += 1;
    } else {
      bucket[status] += 1;
    }

    const credit = attendanceCredit(session, status);
    if (enrolment.registerGroup === "Boy") boysAttendance += credit;
    else girlsAttendance += credit;
  }

  return {
    date,
    session,
    boys: { status: boys, attendanceTotal: boysAttendance },
    girls: { status: girls, attendanceTotal: girlsAttendance },
    combined: {
      status: addStatusCounts(boys, girls),
      attendanceTotal: boysAttendance + girlsAttendance,
    },
  };
}

export interface GroupTotals {
  morning: number;
  afternoon: number;
  total: number;
}

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

function emptyGroupTotals(): GroupTotals {
  return { morning: 0, afternoon: 0, total: 0 };
}

function completionOf(possibleSessions: number, markedEligibleSlots: number): number | null {
  return possibleSessions === 0 ? null : round1((markedEligibleSlots / possibleSessions) * 100);
}

function attendancePercentageOf(possibleSessions: number, attendedSessions: number): number | null {
  return possibleSessions === 0 ? null : round1((attendedSessions / possibleSessions) * 100);
}

export interface StudentSummary {
  enrolmentId: string;
  registerGroup: "Boy" | "Girl";
  possibleSessions: number;
  attendedSessions: number;
  morningAttended: number;
  afternoonAttended: number;
  statusTotals: StatusCounts;
  /** Marked eligible slots / possible slots, as a percentage. `null` means N/A (zero denominator). */
  completion: number | null;
  /** Attended / possible, as a percentage. `null` means N/A (zero denominator). Provisional until completion is 100. */
  attendancePercentage: number | null;
}

// Per-student monthly summary (spec section 8: "per-student monthly
// summary"). summarizePeriod below is built on top of this, so the
// per-student report and the class-wide totals can never drift apart.
export function summarizeStudent(
  enrolment: EnrolmentInfo,
  slots: OpenSlot[],
  marks: AttendanceEntry[],
): StudentSummary {
  const eligible = eligibleSlotsFor(enrolment, slots);
  const statusTotals = emptyStatusCounts();
  let attendedSessions = 0;
  let morningAttended = 0;
  let afternoonAttended = 0;

  for (const slot of eligible) {
    const status = findMark(marks, enrolment.id, slot.date, slot.session);
    if (status === null) statusTotals.Unmarked += 1;
    else statusTotals[status] += 1;

    const credit = attendanceCredit(slot.session, status);
    attendedSessions += credit;
    if (slot.session === 1) morningAttended += credit;
    else afternoonAttended += credit;
  }

  const possibleSessions = eligible.length;
  const markedEligibleSlots = possibleSessions - statusTotals.Unmarked;

  return {
    enrolmentId: enrolment.id,
    registerGroup: enrolment.registerGroup,
    possibleSessions,
    attendedSessions,
    morningAttended,
    afternoonAttended,
    statusTotals,
    completion: completionOf(possibleSessions, markedEligibleSlots),
    attendancePercentage: attendancePercentageOf(possibleSessions, attendedSessions),
  };
}

export interface PeriodTotals {
  scheduledClassSessions: number;
  possibleStudentSessions: number;
  attendedStudentSessions: number;
  boysAttended: GroupTotals;
  girlsAttended: GroupTotals;
  combinedAttended: GroupTotals;
  /** Raw mark counts (not attendance credits), combined across both groups. */
  statusTotals: StatusCounts;
  boysStatusTotals: StatusCounts;
  girlsStatusTotals: StatusCounts;
  /** Marked eligible slots / possible student-slots, as a percentage. `null` means N/A (zero denominator). */
  completion: number | null;
  /** Attended / possible, as a percentage. `null` means N/A (zero denominator). Provisional until completion is 100. */
  attendancePercentage: number | null;
}

// Period (e.g. one month) totals: scheduled sessions, possible/attended
// student-sessions, boys/girls/combined splits, raw status totals, and
// completion/attendance percentages. Built by aggregating summarizeStudent
// over every enrolment, so class-wide totals and the per-student report
// are guaranteed consistent. Spec section 9's hand-calculated fixture is
// reproduced exactly by this function in tests/unit/summaries.test.ts.
export function summarizePeriod(
  slots: OpenSlot[],
  enrolments: EnrolmentInfo[],
  marks: AttendanceEntry[],
): PeriodTotals {
  const scheduledClassSessions = slots.length;

  let possibleStudentSessions = 0;
  let markedEligibleSlots = 0;
  let attendedStudentSessions = 0;
  const boysAttended = emptyGroupTotals();
  const girlsAttended = emptyGroupTotals();
  const boysStatusTotals = emptyStatusCounts();
  const girlsStatusTotals = emptyStatusCounts();

  for (const enrolment of enrolments) {
    const student = summarizeStudent(enrolment, slots, marks);

    possibleStudentSessions += student.possibleSessions;
    markedEligibleSlots += student.possibleSessions - student.statusTotals.Unmarked;
    attendedStudentSessions += student.attendedSessions;

    const attendedBucket = enrolment.registerGroup === "Boy" ? boysAttended : girlsAttended;
    attendedBucket.total += student.attendedSessions;
    attendedBucket.morning += student.morningAttended;
    attendedBucket.afternoon += student.afternoonAttended;

    const statusBucket = enrolment.registerGroup === "Boy" ? boysStatusTotals : girlsStatusTotals;
    statusBucket.P += student.statusTotals.P;
    statusBucket.A += student.statusTotals.A;
    statusBucket.L += student.statusTotals.L;
    statusBucket.Ex += student.statusTotals.Ex;
    statusBucket.Unmarked += student.statusTotals.Unmarked;
  }

  const combinedAttended: GroupTotals = {
    morning: boysAttended.morning + girlsAttended.morning,
    afternoon: boysAttended.afternoon + girlsAttended.afternoon,
    total: boysAttended.total + girlsAttended.total,
  };

  return {
    scheduledClassSessions,
    possibleStudentSessions,
    attendedStudentSessions,
    boysAttended,
    girlsAttended,
    combinedAttended,
    statusTotals: addStatusCounts(boysStatusTotals, girlsStatusTotals),
    boysStatusTotals,
    girlsStatusTotals,
    completion: completionOf(possibleStudentSessions, markedEligibleSlots),
    attendancePercentage: attendancePercentageOf(possibleStudentSessions, attendedStudentSessions),
  };
}
