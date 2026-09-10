"use client";

import { useRouter } from "next/navigation";
import { Fragment, useState } from "react";
import type { Database } from "@/lib/supabase/database.types";
import { CloseSessionForm } from "./CloseSessionForm";

type ClassRow = Database["public"]["Tables"]["classes"]["Row"];
type AcademicYear = Database["public"]["Tables"]["academic_years"]["Row"];

export function ClassList({
  classes,
  academicYears,
}: {
  classes: ClassRow[];
  academicYears: AcademicYear[];
}) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const yearLabel = (id: string) => academicYears.find((y) => y.id === id)?.label ?? id;

  async function generateSessions(classId: string) {
    setBusyId(classId);
    setMessage(null);
    const res = await fetch("/api/calendar-sessions/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ classId }),
    });
    setBusyId(null);
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      setMessage(body.error ?? "Failed to generate sessions");
      return;
    }
    setMessage(`Generated sessions for ${body.generatedDates} open date(s).`);
    router.refresh();
  }

  if (classes.length === 0) {
    return <p className="text-sm text-slate-500">No classes yet.</p>;
  }

  return (
    <div className="space-y-2">
      {message ? <p className="text-sm text-slate-700">{message}</p> : null}
      <table className="w-full max-w-2xl text-sm">
        <thead>
          <tr className="text-left text-xs uppercase text-slate-500">
            <th className="py-1">Class</th>
            <th className="py-1">Academic year</th>
            <th className="py-1" />
          </tr>
        </thead>
        <tbody>
          {classes.map((klass) => (
            <Fragment key={klass.id}>
              <tr className="border-t border-slate-100">
                <td className="py-2">
                  <a href={`/students?classId=${klass.id}`} className="text-slate-900 underline">
                    {klass.name}
                  </a>
                </td>
                <td className="py-2 text-slate-600">{yearLabel(klass.academic_year_id)}</td>
                <td className="py-2 text-right space-x-2">
                  <a
                    href={`/register/${klass.id}`}
                    className="rounded border border-slate-300 px-2 py-1 text-xs text-slate-700 hover:bg-slate-50"
                  >
                    Open register
                  </a>
                  <button
                    type="button"
                    disabled={busyId === klass.id}
                    onClick={() => generateSessions(klass.id)}
                    className="rounded border border-slate-300 px-2 py-1 text-xs text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                  >
                    Generate sessions
                  </button>
                  <button
                    type="button"
                    onClick={() => setExpandedId(expandedId === klass.id ? null : klass.id)}
                    className="rounded border border-slate-300 px-2 py-1 text-xs text-slate-700 hover:bg-slate-50"
                  >
                    {expandedId === klass.id ? "Hide closures" : "Manage closures"}
                  </button>
                </td>
              </tr>
              {expandedId === klass.id ? (
                <tr className="border-t border-slate-50 bg-slate-50">
                  <td colSpan={3} className="p-3">
                    <CloseSessionForm classId={klass.id} />
                  </td>
                </tr>
              ) : null}
            </Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
}
