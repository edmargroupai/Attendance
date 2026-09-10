"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Database } from "@/lib/supabase/database.types";

type AcademicYear = Database["public"]["Tables"]["academic_years"]["Row"];

const WEEKDAYS = [
  ["monday", "Mon"],
  ["tuesday", "Tue"],
  ["wednesday", "Wed"],
  ["thursday", "Thu"],
  ["friday", "Fri"],
  ["saturday", "Sat"],
] as const;

export function CreateClassForm({ academicYears }: { academicYears: AcademicYear[] }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);

    const formData = new FormData(event.currentTarget);
    const payload: Record<string, unknown> = {
      name: formData.get("name"),
      academic_year_id: formData.get("academic_year_id"),
    };
    for (const [key] of WEEKDAYS) {
      payload[key] = formData.get(key) === "on";
    }

    const res = await fetch("/api/classes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    setPending(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "Failed to create class");
      return;
    }

    event.currentTarget.reset();
    router.refresh();
  }

  if (academicYears.length === 0) {
    return (
      <p className="text-sm text-slate-500">Add an academic year first to create a class.</p>
    );
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-wrap items-end gap-3">
      <div>
        <label className="block text-xs font-medium text-slate-600">Class name</label>
        <input
          name="name"
          required
          placeholder="Grade 1A"
          className="rounded border border-slate-300 px-2 py-1 text-sm"
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-slate-600">Academic year</label>
        <select
          name="academic_year_id"
          required
          className="rounded border border-slate-300 px-2 py-1 text-sm"
        >
          {academicYears.map((year) => (
            <option key={year.id} value={year.id}>
              {year.label}
            </option>
          ))}
        </select>
      </div>
      <fieldset className="flex gap-2">
        {WEEKDAYS.map(([key, label]) => (
          <label key={key} className="flex flex-col items-center text-xs text-slate-600">
            {label}
            <input type="checkbox" name={key} defaultChecked={key !== "saturday"} />
          </label>
        ))}
      </fieldset>
      <button
        type="submit"
        disabled={pending}
        className="rounded bg-slate-900 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
      >
        Add class
      </button>
      {error ? <p className="text-sm text-red-700">{error}</p> : null}
    </form>
  );
}
