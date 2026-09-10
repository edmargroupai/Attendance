"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export type RosterEntry = {
  enrolmentId: string;
  studentId: string;
  surname: string;
  given_names: string;
  admission_number: string | null;
  register_group: "Boy" | "Girl";
  start_date: string;
  end_date: string | null;
};

function Group({
  title,
  entries,
  onWithdraw,
  busyId,
}: {
  title: string;
  entries: RosterEntry[];
  onWithdraw: (enrolmentId: string) => void;
  busyId: string | null;
}) {
  return (
    <div>
      <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {title} ({entries.length})
      </h3>
      {entries.length === 0 ? (
        <p className="py-1 text-sm text-slate-400">None</p>
      ) : (
        <table className="mt-1 w-full max-w-2xl text-sm">
          <tbody>
            {entries.map((entry, i) => (
              <tr key={entry.enrolmentId} className="border-t border-slate-100">
                <td className="w-8 py-1 text-slate-400">{i + 1}</td>
                <td className="py-1">
                  {entry.surname}, {entry.given_names}
                </td>
                <td className="py-1 text-slate-500">{entry.admission_number ?? "—"}</td>
                <td className="py-1 text-slate-500">
                  {entry.start_date}
                  {entry.end_date ? ` → ${entry.end_date}` : ""}
                </td>
                <td className="py-1 text-right">
                  {!entry.end_date ? (
                    <button
                      type="button"
                      disabled={busyId === entry.enrolmentId}
                      onClick={() => onWithdraw(entry.enrolmentId)}
                      className="rounded border border-slate-300 px-2 py-0.5 text-xs text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                    >
                      Withdraw
                    </button>
                  ) : (
                    <span className="text-xs text-slate-400">withdrawn</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

export function Roster({ boys, girls }: { boys: RosterEntry[]; girls: RosterEntry[] }) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);

  async function onWithdraw(enrolmentId: string) {
    const endDate = window.prompt("Withdrawal date (YYYY-MM-DD):", new Date().toISOString().slice(0, 10));
    if (!endDate) return;

    setBusyId(enrolmentId);
    const res = await fetch(`/api/enrolments/${enrolmentId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ end_date: endDate }),
    });
    setBusyId(null);

    if (res.ok) {
      router.refresh();
    } else {
      const body = await res.json().catch(() => ({}));
      window.alert(body.error ?? "Failed to withdraw student");
    }
  }

  return (
    <div className="space-y-4">
      <Group title="Boys" entries={boys} onWithdraw={onWithdraw} busyId={busyId} />
      <Group title="Girls" entries={girls} onWithdraw={onWithdraw} busyId={busyId} />
    </div>
  );
}
