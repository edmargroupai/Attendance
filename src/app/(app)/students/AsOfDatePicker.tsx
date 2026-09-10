"use client";

import { useRouter, useSearchParams } from "next/navigation";

export function AsOfDatePicker({ classId, asOf }: { classId: string; asOf: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function onChange(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("classId", classId);
    params.set("asOf", value);
    router.push(`/students?${params.toString()}`);
  }

  return (
    <div className="flex items-center gap-2 text-sm">
      <label htmlFor="asOf" className="font-medium text-slate-700">
        Roster as of
      </label>
      <input
        id="asOf"
        type="date"
        defaultValue={asOf}
        onChange={(e) => onChange(e.target.value)}
        className="rounded border border-slate-300 px-2 py-1"
      />
    </div>
  );
}
