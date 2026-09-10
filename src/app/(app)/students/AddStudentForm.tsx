"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function AddStudentForm({ classId }: { classId: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);

    const formData = new FormData(event.currentTarget);
    const res = await fetch("/api/students", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        classId,
        surname: formData.get("surname"),
        given_names: formData.get("given_names"),
        register_group: formData.get("register_group"),
        admission_number: formData.get("admission_number") || null,
        start_date: formData.get("start_date"),
        end_date: formData.get("end_date") || null,
      }),
    });

    setPending(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "Failed to add student");
      return;
    }

    event.currentTarget.reset();
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-wrap items-end gap-3">
      <div>
        <label className="block text-xs font-medium text-slate-600">Surname</label>
        <input name="surname" required className="rounded border border-slate-300 px-2 py-1 text-sm" />
      </div>
      <div>
        <label className="block text-xs font-medium text-slate-600">Given names</label>
        <input
          name="given_names"
          required
          className="rounded border border-slate-300 px-2 py-1 text-sm"
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-slate-600">Group</label>
        <select name="register_group" required className="rounded border border-slate-300 px-2 py-1 text-sm">
          <option value="Boy">Boy</option>
          <option value="Girl">Girl</option>
        </select>
      </div>
      <div>
        <label className="block text-xs font-medium text-slate-600">Admission #</label>
        <input
          name="admission_number"
          className="w-28 rounded border border-slate-300 px-2 py-1 text-sm"
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
        <input name="end_date" type="date" className="rounded border border-slate-300 px-2 py-1 text-sm" />
      </div>
      <button
        type="submit"
        disabled={pending}
        className="rounded bg-slate-900 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
      >
        Add student
      </button>
      {error ? <p className="w-full text-sm text-red-700">{error}</p> : null}
    </form>
  );
}
