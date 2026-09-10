"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function CreateAcademicYearForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);

    const formData = new FormData(event.currentTarget);
    const res = await fetch("/api/academic-years", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        label: formData.get("label"),
        start_date: formData.get("start_date"),
        end_date: formData.get("end_date"),
      }),
    });

    setPending(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "Failed to create academic year");
      return;
    }

    event.currentTarget.reset();
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-wrap items-end gap-3">
      <div>
        <label className="block text-xs font-medium text-slate-600">Label</label>
        <input
          name="label"
          required
          placeholder="2026-2027"
          className="rounded border border-slate-300 px-2 py-1 text-sm"
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-slate-600">Start date</label>
        <input
          name="start_date"
          type="date"
          required
          className="rounded border border-slate-300 px-2 py-1 text-sm"
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-slate-600">End date</label>
        <input
          name="end_date"
          type="date"
          required
          className="rounded border border-slate-300 px-2 py-1 text-sm"
        />
      </div>
      <button
        type="submit"
        disabled={pending}
        className="rounded bg-slate-900 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
      >
        Add academic year
      </button>
      {error ? <p className="text-sm text-red-700">{error}</p> : null}
    </form>
  );
}
