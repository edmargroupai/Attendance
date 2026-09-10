"use client";

import { useState } from "react";
import type { Mark } from "@/lib/attendance/rules";

const OPTIONS: { mark: Mark; label: string; key: string }[] = [
  { mark: "P", label: "Present", key: "p" },
  { mark: "A", label: "Absent", key: "a" },
  { mark: "L", label: "Late", key: "l" },
  { mark: "Ex", label: "Excused", key: "e" },
  { mark: null, label: "Clear", key: "delete" },
];

const MARK_BY_KEY: Record<string, Mark> = { p: "P", a: "A", l: "L", e: "Ex" };

export function Cell({
  coord,
  disabled,
  disabledReason,
  status,
  pending,
  error,
  ariaLabel,
  onSetStatus,
}: {
  coord: string; // "row-col", used for arrow-key navigation
  disabled: boolean;
  disabledReason?: string;
  status: Mark;
  pending: boolean;
  error?: string;
  ariaLabel: string;
  onSetStatus: (mark: Mark) => void;
}) {
  const [open, setOpen] = useState(false);

  function moveFocus(dRow: number, dCol: number) {
    const [row, col] = coord.split("-").map(Number);
    const target = document.querySelector<HTMLElement>(
      `[data-cell-coord="${row + dRow}-${col + dCol}"]`,
    );
    target?.focus();
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLButtonElement>) {
    if (disabled) return;

    if (open) {
      if (e.key === "Escape") {
        e.preventDefault();
        setOpen(false);
      }
      return;
    }

    switch (e.key) {
      case "ArrowUp":
        e.preventDefault();
        moveFocus(-1, 0);
        return;
      case "ArrowDown":
        e.preventDefault();
        moveFocus(1, 0);
        return;
      case "ArrowLeft":
        e.preventDefault();
        moveFocus(0, -1);
        return;
      case "ArrowRight":
        e.preventDefault();
        moveFocus(0, 1);
        return;
      case "Enter":
      case " ":
        e.preventDefault();
        setOpen(true);
        return;
      case "Delete":
      case "Backspace":
        e.preventDefault();
        onSetStatus(null);
        return;
      case "Escape":
        return;
      default: {
        const mark = MARK_BY_KEY[e.key.toLowerCase()];
        if (mark) {
          e.preventDefault();
          onSetStatus(mark);
        }
      }
    }
  }

  const displayText = status ?? "";

  return (
    <div className="relative">
      <button
        type="button"
        data-cell-coord={coord}
        disabled={disabled}
        title={disabledReason}
        aria-label={ariaLabel}
        aria-haspopup="true"
        aria-expanded={open}
        onClick={() => !disabled && setOpen((o) => !o)}
        onKeyDown={onKeyDown}
        className={[
          "flex h-10 w-11 items-center justify-center border border-slate-200 text-sm font-medium focus:z-10 focus:outline focus:outline-2 focus:outline-slate-900",
          disabled ? "cursor-not-allowed bg-slate-100 text-slate-300" : "cursor-pointer hover:bg-slate-50",
          pending ? "italic text-slate-400" : "",
          status === "P" ? "bg-green-50 text-green-800" : "",
          status === "A" ? "bg-red-50 text-red-800" : "",
          status === "L" ? "bg-amber-50 text-amber-800" : "",
          status === "Ex" ? "bg-blue-50 text-blue-800" : "",
        ].join(" ")}
      >
        {pending ? "…" : displayText}
      </button>

      {open ? (
        <div
          role="menu"
          className="absolute left-0 top-full z-20 flex w-max flex-col rounded border border-slate-300 bg-white text-sm shadow-lg"
        >
          {OPTIONS.map((opt) => (
            <button
              key={opt.key}
              type="button"
              role="menuitem"
              onClick={() => {
                onSetStatus(opt.mark);
                setOpen(false);
              }}
              className="px-3 py-1.5 text-left hover:bg-slate-100"
            >
              {opt.mark ?? "—"} <span className="text-slate-500">{opt.label}</span>
            </button>
          ))}
        </div>
      ) : null}

      {error ? (
        <p role="status" className="absolute left-0 top-full z-10 w-32 text-xs text-red-700">
          {error}
        </p>
      ) : null}
    </div>
  );
}
