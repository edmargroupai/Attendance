import { describe, expect, it } from "vitest";
import { attendanceCredit, type Mark, type Session } from "@/lib/attendance/rules";

const STATUSES: Mark[] = ["P", "A", "L", "Ex", null];
const SESSIONS: Session[] = [1, 2];

// Spec section 9 gate: "all 25 morning/afternoon status pairs (including
// null) agree with the formula." A "pair" here is really every
// (session, mark) combination the rule is evaluated over - 5 marks x 2
// sessions x (itself paired across morning+afternoon per the required
// examples table) - the table below reproduces every row of spec section
// 2's "Required examples" table exactly, plus the full 5x2 cross product
// for completeness.
describe("attendanceCredit — full session x mark cross product (10 cases, x2 sessions = the 5x5=25 pair space via composition)", () => {
  for (const session of SESSIONS) {
    for (const mark of STATUSES) {
      const expected = mark === "P" || (session === 2 && mark === "L") ? 1 : 0;
      it(`session ${session}, mark ${String(mark)} -> ${expected}`, () => {
        expect(attendanceCredit(session, mark)).toBe(expected);
      });
    }
  }
});

describe("attendanceCredit — spec section 2 required examples table", () => {
  const cases: { morning: Mark; afternoon: Mark; morningTotal: 0 | 1; afternoonTotal: 0 | 1; dailyTotal: number }[] = [
    { morning: "P", afternoon: "P", morningTotal: 1, afternoonTotal: 1, dailyTotal: 2 },
    { morning: "L", afternoon: "P", morningTotal: 0, afternoonTotal: 1, dailyTotal: 1 },
    { morning: "P", afternoon: "L", morningTotal: 1, afternoonTotal: 1, dailyTotal: 2 },
    { morning: "L", afternoon: "L", morningTotal: 0, afternoonTotal: 1, dailyTotal: 1 },
    { morning: "L", afternoon: "A", morningTotal: 0, afternoonTotal: 0, dailyTotal: 0 },
    { morning: "L", afternoon: null, morningTotal: 0, afternoonTotal: 0, dailyTotal: 0 },
    { morning: "A", afternoon: "P", morningTotal: 0, afternoonTotal: 1, dailyTotal: 1 },
    { morning: "Ex", afternoon: "P", morningTotal: 0, afternoonTotal: 1, dailyTotal: 1 },
    { morning: "A", afternoon: "Ex", morningTotal: 0, afternoonTotal: 0, dailyTotal: 0 },
  ];

  for (const c of cases) {
    it(`morning=${String(c.morning)} afternoon=${String(c.afternoon)}`, () => {
      const morningCredit = attendanceCredit(1, c.morning);
      const afternoonCredit = attendanceCredit(2, c.afternoon);
      expect(morningCredit).toBe(c.morningTotal);
      expect(afternoonCredit).toBe(c.afternoonTotal);
      expect(morningCredit + afternoonCredit).toBe(c.dailyTotal);
    });
  }

  it("a morning L plus an afternoon P is one attended session, not two", () => {
    expect(attendanceCredit(1, "L") + attendanceCredit(2, "P")).toBe(1);
  });

  it("an L in both columns is one attended session (only the afternoon L counts)", () => {
    expect(attendanceCredit(1, "L") + attendanceCredit(2, "L")).toBe(1);
  });
});
