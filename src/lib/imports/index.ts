export type RegisterGroup = "Boy" | "Girl";

export type ImportRow = {
  admission_number: string | null;
  surname: string;
  given_names: string;
  register_group: RegisterGroup;
  start_date: string;
  end_date: string | null;
};

export type ValidatedImportRow = {
  line: number;
  row: ImportRow;
  errors: string[];
};

export const MAX_IMPORT_ROWS = 500;
export const MAX_IMPORT_BYTES = 1_000_000;

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

// Spec section 4: "Never guess group or split an ambiguous full name
// automatically." This is a starting-point split the caller must show as
// editable columns before import, not a silent final answer - the last
// word is treated as the surname, matching the common "Given Names
// Surname" pasted-list convention, but the user corrects it in preview.
export function parsePastedNames(text: string): { surname: string; given_names: string }[] {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((line) => {
      const parts = line.split(/\s+/);
      if (parts.length === 1) {
        return { surname: parts[0], given_names: "" };
      }
      const surname = parts[parts.length - 1];
      const given_names = parts.slice(0, -1).join(" ");
      return { surname, given_names };
    });
}

export type CsvRow = Record<string, string>;

export function parseCsv(text: string): { header: string[]; rows: CsvRow[] } {
  const lines = text.split(/\r\n|\n|\r/).filter((line) => line.length > 0);
  if (lines.length === 0) {
    return { header: [], rows: [] };
  }

  const parseLine = (line: string): string[] => {
    const fields: string[] = [];
    let current = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (inQuotes) {
        if (char === '"' && line[i + 1] === '"') {
          current += '"';
          i++;
        } else if (char === '"') {
          inQuotes = false;
        } else {
          current += char;
        }
      } else if (char === '"') {
        inQuotes = true;
      } else if (char === ",") {
        fields.push(current);
        current = "";
      } else {
        current += char;
      }
    }
    fields.push(current);
    return fields;
  };

  const header = parseLine(lines[0]).map((h) => h.trim());
  const rows = lines.slice(1).map((line) => {
    const values = parseLine(line);
    const row: CsvRow = {};
    header.forEach((key, i) => {
      row[key] = (values[i] ?? "").trim();
    });
    return row;
  });

  return { header, rows };
}

const REQUIRED_CSV_COLUMNS = [
  "admission_number",
  "surname",
  "given_names",
  "register_group",
  "start_date",
  "end_date",
] as const;

export function validateImportRows(
  rows: CsvRow[],
  totalBytes: number,
): { validated: ValidatedImportRow[]; fileErrors: string[] } {
  const fileErrors: string[] = [];

  if (totalBytes > MAX_IMPORT_BYTES) {
    fileErrors.push(`File is larger than ${MAX_IMPORT_BYTES / 1_000_000}MB.`);
  }
  if (rows.length > MAX_IMPORT_ROWS) {
    fileErrors.push(`File has ${rows.length} rows; the limit is ${MAX_IMPORT_ROWS}.`);
  }
  if (rows.length === 0) {
    fileErrors.push("File has no data rows.");
  }

  const validated: ValidatedImportRow[] = rows.map((raw, i) => {
    const errors: string[] = [];
    const line = i + 2; // +1 for header, +1 for 1-indexing

    for (const column of REQUIRED_CSV_COLUMNS) {
      if (!(column in raw)) {
        errors.push(`missing column "${column}"`);
      }
    }

    const surname = raw.surname?.trim() ?? "";
    const given_names = raw.given_names?.trim() ?? "";
    const registerGroupRaw = raw.register_group?.trim() ?? "";
    const start_date = raw.start_date?.trim() ?? "";
    const end_date = raw.end_date?.trim() ?? "";
    const admission_number = raw.admission_number?.trim() ?? "";

    if (!surname) errors.push("surname is required");
    if (!given_names) errors.push("given_names is required");
    if (registerGroupRaw !== "Boy" && registerGroupRaw !== "Girl") {
      errors.push('register_group must be "Boy" or "Girl"');
    }
    if (!ISO_DATE.test(start_date)) {
      errors.push("start_date must be YYYY-MM-DD");
    }
    if (end_date && !ISO_DATE.test(end_date)) {
      errors.push("end_date must be YYYY-MM-DD");
    }
    if (end_date && ISO_DATE.test(start_date) && ISO_DATE.test(end_date) && end_date < start_date) {
      errors.push("end_date must not be before start_date");
    }

    const row: ImportRow = {
      admission_number: admission_number || null,
      surname,
      given_names,
      register_group: (registerGroupRaw === "Girl" ? "Girl" : "Boy") as RegisterGroup,
      start_date,
      end_date: end_date || null,
    };

    return { line, row, errors };
  });

  const seenAdmissionNumbers = new Set<string>();
  for (const entry of validated) {
    const num = entry.row.admission_number;
    if (!num) continue;
    if (seenAdmissionNumbers.has(num)) {
      entry.errors.push(`duplicate admission_number "${num}" within this file`);
    }
    seenAdmissionNumbers.add(num);
  }

  return { validated, fileErrors };
}

// Non-blocking warning per spec section 4: "Name matches produce
// warnings, not automatic merges, because different children may share a
// name."
export function findNameCollisions(
  incoming: { surname: string; given_names: string }[],
  existing: { surname: string; given_names: string }[],
): number[] {
  const existingKeys = new Set(
    existing.map((s) => `${s.surname.toLowerCase()}|${s.given_names.toLowerCase()}`),
  );
  const collisions: number[] = [];
  incoming.forEach((row, i) => {
    const key = `${row.surname.toLowerCase()}|${row.given_names.toLowerCase()}`;
    if (existingKeys.has(key)) {
      collisions.push(i);
    }
  });
  return collisions;
}
