"use client";

import { useRouter } from "next/navigation";

export function ClassPicker({
  classes,
  selectedClassId,
  month,
}: {
  classes: { id: string; name: string }[];
  selectedClassId: string;
  month: string;
}) {
  const router = useRouter();

  return (
    <select
      defaultValue={selectedClassId}
      onChange={(e) => router.push(`/reports?classId=${e.target.value}&month=${month}`)}
      className="rounded border border-slate-300 px-2 py-1"
    >
      {classes.map((c) => (
        <option key={c.id} value={c.id}>
          {c.name}
        </option>
      ))}
    </select>
  );
}
