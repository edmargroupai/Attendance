"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

// Spec section 4: class-specific closures/half-days. Looks the session up
// by (class, date, session) via the browser client (RLS-scoped to the
// signed-in owner), then PATCHes it closed/open through the API route
// that also enforces the marked-slot guard.
export function CloseSessionForm({ classId }: { classId: string }) {
  const [date, setDate] = useState("");
  const [session, setSession] = useState<"1" | "2" | "both">("both");
  const [reason, setReason] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function closeSession() {
    if (!date || !reason) {
      setStatus("Pick a date and enter a reason.");
      return;
    }
    setPending(true);
    setStatus(null);

    const supabase = createClient();
    const sessions = session === "both" ? [1, 2] : [Number(session)];
    const { data: rows, error } = await supabase
      .from("calendar_sessions")
      .select("id, session")
      .eq("class_id", classId)
      .eq("date", date)
      .in("session", sessions);

    if (error || !rows || rows.length === 0) {
      setPending(false);
      setStatus(error?.message ?? "No generated session found for that date. Generate sessions first.");
      return;
    }

    const results = await Promise.all(
      rows.map((row) =>
        fetch(`/api/calendar-sessions/${row.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ is_open: false, closure_reason: reason }),
        }),
      ),
    );

    setPending(false);
    const failed = results.filter((r) => !r.ok).length;
    setStatus(
      failed > 0
        ? `${failed} of ${results.length} session(s) could not be closed.`
        : `Closed ${results.length} session(s) on ${date}.`,
    );
  }

  return (
    <div className="flex flex-wrap items-end gap-2 text-sm">
      <div>
        <label className="block text-xs font-medium text-slate-600">Date</label>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="rounded border border-slate-300 px-2 py-1"
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-slate-600">Session</label>
        <select
          value={session}
          onChange={(e) => setSession(e.target.value as "1" | "2" | "both")}
          className="rounded border border-slate-300 px-2 py-1"
        >
          <option value="both">Both</option>
          <option value="1">1 (morning)</option>
          <option value="2">2 (afternoon)</option>
        </select>
      </div>
      <div>
        <label className="block text-xs font-medium text-slate-600">Reason</label>
        <input
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Public holiday"
          className="rounded border border-slate-300 px-2 py-1"
        />
      </div>
      <button
        type="button"
        disabled={pending}
        onClick={closeSession}
        className="rounded border border-slate-300 px-3 py-1.5 text-slate-700 hover:bg-slate-50 disabled:opacity-50"
      >
        Close
      </button>
      {status ? <p className="w-full text-slate-600">{status}</p> : null}
    </div>
  );
}
