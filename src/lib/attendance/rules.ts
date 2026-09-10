// Bump whenever the credit/summary rules themselves change (not for
// unrelated code changes). Reports display this so a printed/exported
// page is traceable to the rule version that produced it (spec section
// 8: "rule version").
export const ATTENDANCE_RULE_VERSION = "1.0";

// Spec section 2 — authoritative. Morning P counts 1; afternoon P or L
// counts 1. A morning L records lateness but does not generate an
// afternoon mark; the teacher records afternoon attendance
// independently. An L in morning plus a P in afternoon is one attended
// session, not two.
export type Mark = "P" | "A" | "L" | "Ex" | null;
export type Session = 1 | 2;

export function attendanceCredit(session: Session, mark: Mark): 0 | 1 {
  return mark === "P" || (session === 2 && mark === "L") ? 1 : 0;
}
