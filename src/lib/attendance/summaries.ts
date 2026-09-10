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

export interface PeriodTotals {
  scheduledClassSessions: number;
  possibleStudentSessions: number;
  attendedStudentSessions: number;
  boysAttended: GroupTotals;
  girlsAttended: GroupTotals;
  combinedAttended: GroupTotals;
  statusTotals: StatusCounts;
  /** Marked eligible slots / possible student-slots, as a percentage. `null` means N/A (zero denominator). */
  completion: number | null;
  /** Attended / possible, as a percentage. `null` means N/A (zero denominator). Provisional until completion is 100. */
  attendancePercentage: number | null;
}

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

function emptyGroupTotals(): GroupTotals {
  return { morning: 0, afternoon: 0, total: 0 };
}

// Period (e.g. one month) totals: scheduled sessions, possible/attended
// student-sessions, boys/girls/combined splits, raw status totals, and
// completion/attendance percentages. Spec section 9's hand-calculated
// fixture is reproduced exactly by this function in
// tests/unit/summaries.test.ts.
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
  const statusTotals = emptyStatusCounts();

  for (const enrolment of enrolments) {
    const eligible = eligibleSlotsFor(enrolment, slots);
    possibleStudentSessions += eligible.length;

    const bucket = enrolment.registerGroup === "Boy" ? boysAttended : girlsAttended;

    for (const slot of eligible) {
      const status = findMark(marks, enrolment.id, slot.date, slot.session);

      if (status === null) {
        statusTotals.Unmarked += 1;
      } else {
        statusTotals[status] += 1;
        markedEligibleSlots += 1;
      }

      const credit = attendanceCredit(slot.session, status);
      attendedStudentSessions += credit;
      bucket.total += credit;
      if (slot.session === 1) bucket.morning += credit;
      else bucket.afternoon += credit;
    }
  }

  const combinedAttended: GroupTotals = {
    morning: boysAttended.morning + girlsAttended.morning,
    afternoon: boysAttended.afternoon + girlsAttended.afternoon,
    total: boysAttended.total + girlsAttended.total,
  };

  const completion =
    possibleStudentSessions === 0
      ? null
      : round1((markedEligibleSlots / possibleStudentSessions) * 100);
  const attendancePercentage =
    possibleStudentSessions === 0
      ? null
      : round1((attendedStudentSessions / possibleStudentSessions) * 100);

  return {
    scheduledClassSessions,
    possibleStudentSessions,
    attendedStudentSessions,
    boysAttended,
    girlsAttended,
    combinedAttended,
    statusTotals,
    completion,
    attendancePercentage,
  };
}
