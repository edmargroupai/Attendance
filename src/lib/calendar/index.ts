export type WeekdayConfig = {
  monday: boolean;
  tuesday: boolean;
  wednesday: boolean;
  thursday: boolean;
  friday: boolean;
  saturday: boolean;
};

type DayName = "sunday" | keyof WeekdayConfig;

// Index matches Date.getUTCDay() (0 = Sunday .. 6 = Saturday). Sunday is
// never a teaching day (spec section 1), so it has no WeekdayConfig field.
const WEEKDAY_BY_INDEX: DayName[] = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
];

function parseIsoDate(value: string): Date {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

function toIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

// Deterministic: same (startDate, endDate, weekdayConfig) always produces
// the same date list, so generation can be re-run safely (the caller
// inserts with ON CONFLICT DO NOTHING against the existing
// (class_id, date, session) unique constraint).
export function generateOpenDates(
  startDate: string,
  endDate: string,
  weekdayConfig: WeekdayConfig,
): string[] {
  const start = parseIsoDate(startDate);
  const end = parseIsoDate(endDate);
  if (end < start) {
    throw new Error("endDate must not be before startDate");
  }

  const dates: string[] = [];
  const cursor = new Date(start);

  while (cursor <= end) {
    const dayName = WEEKDAY_BY_INDEX[cursor.getUTCDay()];
    if (dayName !== "sunday" && weekdayConfig[dayName]) {
      dates.push(toIsoDate(cursor));
    }
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  return dates;
}
