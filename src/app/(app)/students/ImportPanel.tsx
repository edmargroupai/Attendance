"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  MAX_IMPORT_ROWS,
  findNameCollisions,
  parseCsv,
  parsePastedNames,
  validateImportRows,
  type ImportRow,
  type RegisterGroup,
} from "@/lib/imports";

type PreviewRow = ImportRow & { errors: string[] };

const CSV_TEMPLATE =
  "admission_number,surname,given_names,register_group,start_date,end_date\n" +
  "A100,Brown,Adam,Boy,2026-09-01,\n";

function validateRow(row: ImportRow): string[] {
  const errors: string[] = [];
  if (!row.surname) errors.push("surname is required");
  if (!row.given_names) errors.push("given_names is required");
  if (row.register_group !== "Boy" && row.register_group !== "Girl") {
    errors.push('register_group must be "Boy" or "Girl"');
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(row.start_date)) {
    errors.push("start_date must be YYYY-MM-DD");
  }
  if (row.end_date && !/^\d{4}-\d{2}-\d{2}$/.test(row.end_date)) {
    errors.push("end_date must be YYYY-MM-DD");
  }
  return errors;
}

export function ImportPanel({
  classId,
  existingRoster,
}: {
  classId: string;
  existingRoster: { surname: string; given_names: string }[];
}) {
  const router = useRouter();
  const [rows, setRows] = useState<PreviewRow[]>([]);
  const [pasteText, setPasteText] = useState("");
  const [batchGroup, setBatchGroup] = useState<RegisterGroup>("Boy");
  const [batchStartDate, setBatchStartDate] = useState("");
  const [fileErrors, setFileErrors] = useState<string[]>([]);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const collisions = useMemo(() => findNameCollisions(rows, existingRoster), [rows, existingRoster]);

  function parsePaste() {
    if (!batchStartDate) {
      setFileErrors(["Pick a start date for this batch before parsing."]);
      return;
    }
    setFileErrors([]);
    const parsed = parsePastedNames(pasteText);
    const next: PreviewRow[] = parsed.map((p) => {
      const row: ImportRow = {
        admission_number: null,
        surname: p.surname,
        given_names: p.given_names,
        register_group: batchGroup,
        start_date: batchStartDate,
        end_date: null,
      };
      return { ...row, errors: validateRow(row) };
    });
    setRows(next);
  }

  async function onCsvFile(file: File) {
    const text = await file.text();
    const { rows: csvRows } = parseCsv(text);
    const { validated, fileErrors: fErrors } = validateImportRows(csvRows, file.size);
    setFileErrors(fErrors);
    setRows(validated.map((v) => ({ ...v.row, errors: v.errors })));
  }

  function updateRow(index: number, patch: Partial<ImportRow>) {
    setRows((prev) => {
      const next = [...prev];
      const merged = { ...next[index], ...patch };
      next[index] = { ...merged, errors: validateRow(merged) };
      return next;
    });
  }

  function removeRow(index: number) {
    setRows((prev) => prev.filter((_, i) => i !== index));
  }

  const hasBlockingErrors = rows.some((r) => r.errors.length > 0) || rows.length === 0;

  async function submitImport() {
    setSubmitError(null);
    if (rows.length > MAX_IMPORT_ROWS) {
      setSubmitError(`Cannot import more than ${MAX_IMPORT_ROWS} rows at once.`);
      return;
    }
    setPending(true);
    const res = await fetch("/api/imports", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        classId,
        rows: rows.map((r) => ({
          admission_number: r.admission_number,
          surname: r.surname,
          given_names: r.given_names,
          register_group: r.register_group,
          start_date: r.start_date,
          end_date: r.end_date,
        })),
      }),
    });
    setPending(false);

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setSubmitError(body.error ?? "Import failed");
      return;
    }

    setRows([]);
    setPasteText("");
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-6">
        <div className="max-w-md space-y-2">
          <h3 className="text-xs font-semibold uppercase text-slate-500">Paste a list</h3>
          <textarea
            value={pasteText}
            onChange={(e) => setPasteText(e.target.value)}
            rows={5}
            placeholder={"One name per line, e.g.\nAdam Brown\nBrianna Williams"}
            className="w-full rounded border border-slate-300 p-2 text-sm"
          />
          <div className="flex items-end gap-2">
            <div>
              <label className="block text-xs font-medium text-slate-600">Group (whole batch)</label>
              <select
                value={batchGroup}
                onChange={(e) => setBatchGroup(e.target.value as RegisterGroup)}
                className="rounded border border-slate-300 px-2 py-1 text-sm"
              >
                <option value="Boy">Boy</option>
                <option value="Girl">Girl</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600">Start date</label>
              <input
                type="date"
                value={batchStartDate}
                onChange={(e) => setBatchStartDate(e.target.value)}
                className="rounded border border-slate-300 px-2 py-1 text-sm"
              />
            </div>
            <button
              type="button"
              onClick={parsePaste}
              className="rounded border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
            >
              Preview
            </button>
          </div>
        </div>

        <div className="space-y-2">
          <h3 className="text-xs font-semibold uppercase text-slate-500">Or import CSV</h3>
          <input
            type="file"
            accept=".csv,text/csv"
            onChange={(e) => e.target.files?.[0] && onCsvFile(e.target.files[0])}
            className="text-sm"
          />
          <a
            href={`data:text/csv;charset=utf-8,${encodeURIComponent(CSV_TEMPLATE)}`}
            download="students-template.csv"
            className="block text-sm text-slate-600 underline"
          >
            Download CSV template
          </a>
        </div>
      </div>

      {fileErrors.length > 0 ? (
        <ul className="list-inside list-disc text-sm text-red-700">
          {fileErrors.map((e) => (
            <li key={e}>{e}</li>
          ))}
        </ul>
      ) : null}

      {rows.length > 0 ? (
        <div className="space-y-2">
          <p className="text-sm text-slate-600">
            {rows.length} row(s) ready to review.{" "}
            {collisions.length > 0
              ? `${collisions.length} name(s) match an existing student - not blocked, just flagged.`
              : null}
          </p>
          <div className="overflow-x-auto">
            <table className="text-sm">
              <thead>
                <tr className="text-left text-xs uppercase text-slate-500">
                  <th className="py-1 pr-2">Surname</th>
                  <th className="py-1 pr-2">Given names</th>
                  <th className="py-1 pr-2">Group</th>
                  <th className="py-1 pr-2">Admission #</th>
                  <th className="py-1 pr-2">Start date</th>
                  <th className="py-1 pr-2">End date</th>
                  <th className="py-1" />
                </tr>
              </thead>
              <tbody>
                {rows.map((row, i) => (
                  <tr key={i} className="border-t border-slate-100 align-top">
                    <td className="py-1 pr-2">
                      <input
                        value={row.surname}
                        onChange={(e) => updateRow(i, { surname: e.target.value })}
                        className="w-28 rounded border border-slate-300 px-1 py-0.5"
                      />
                    </td>
                    <td className="py-1 pr-2">
                      <input
                        value={row.given_names}
                        onChange={(e) => updateRow(i, { given_names: e.target.value })}
                        className="w-32 rounded border border-slate-300 px-1 py-0.5"
                      />
                    </td>
                    <td className="py-1 pr-2">
                      <select
                        value={row.register_group}
                        onChange={(e) => updateRow(i, { register_group: e.target.value as RegisterGroup })}
                        className="rounded border border-slate-300 px-1 py-0.5"
                      >
                        <option value="Boy">Boy</option>
                        <option value="Girl">Girl</option>
                      </select>
                    </td>
                    <td className="py-1 pr-2">
                      <input
                        value={row.admission_number ?? ""}
                        onChange={(e) => updateRow(i, { admission_number: e.target.value || null })}
                        className="w-20 rounded border border-slate-300 px-1 py-0.5"
                      />
                    </td>
                    <td className="py-1 pr-2">
                      <input
                        type="date"
                        value={row.start_date}
                        onChange={(e) => updateRow(i, { start_date: e.target.value })}
                        className="rounded border border-slate-300 px-1 py-0.5"
                      />
                    </td>
                    <td className="py-1 pr-2">
                      <input
                        type="date"
                        value={row.end_date ?? ""}
                        onChange={(e) => updateRow(i, { end_date: e.target.value || null })}
                        className="rounded border border-slate-300 px-1 py-0.5"
                      />
                    </td>
                    <td className="py-1">
                      <button
                        type="button"
                        onClick={() => removeRow(i)}
                        className="text-xs text-red-700 underline"
                      >
                        Remove
                      </button>
                      {row.errors.length > 0 ? (
                        <ul className="mt-1 list-inside list-disc text-xs text-red-700">
                          {row.errors.map((e) => (
                            <li key={e}>{e}</li>
                          ))}
                        </ul>
                      ) : collisions.includes(i) ? (
                        <p className="mt-1 text-xs text-amber-700">possible duplicate name</p>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <button
            type="button"
            disabled={pending || hasBlockingErrors}
            onClick={submitImport}
            className="rounded bg-slate-900 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
          >
            Import {rows.length} student(s)
          </button>
          {submitError ? <p className="text-sm text-red-700">{submitError}</p> : null}
        </div>
      ) : null}
    </div>
  );
}
