// Spec section 8: "Neutralise formula injection in user-entered text
// fields beginning with spreadsheet formula characters; correctly quote
// commas, quotes and line breaks."
const FORMULA_PREFIXES = ["=", "+", "-", "@", "\t", "\r"];

// Apply only to genuinely free-text, user-entered fields (names, closure
// reasons, school/class labels) - never to computed numbers, dates, or
// enum-like status codes, since those can legitimately start with "-"
// (a negative would never occur here, but the rule is scoped narrowly on
// principle) and are never attacker-controlled free text.
export function sanitizeCsvText(value: string): string {
  return FORMULA_PREFIXES.some((prefix) => value.startsWith(prefix)) ? `'${value}` : value;
}

function quoteCsvCell(value: string): string {
  if (/[",\r\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export type CsvCell = string | number | null;

export function toCsv(rows: CsvCell[][]): string {
  return rows
    .map((row) => row.map((cell) => quoteCsvCell(cell === null ? "" : String(cell))).join(","))
    .join("\r\n");
}
