"use client";
// Countdown for a hold the physio said («κρατήστε 10 δευτερόλεπτα»). The patient starts it when ready,
// with a real button (like «Το έκανα σήμερα» on the home program). A ring empties around the seconds;
// at the end it turns into a green ✓, with a short vibration where the phone supports it, and the
// state in words for screen readers. One row, so the set number stays the biggest thing.
import { useEffect, useState } from "react";

import { cx } from "@/app/lib/cx";

const R = 42;
const CIRCUMFERENCE = 2 * Math.PI * R;

export function HoldTimer({ seconds }: { seconds: number }) {
  const [left, setLeft] = useState<number | null>(null); // null = not started

  useEffect(() => {
    if (left === null || left <= 0) return;
    const timer = setTimeout(() => setLeft(left - 1), 1000);
    return () => clearTimeout(timer);
  }, [left]);

  useEffect(() => {
    if (left === 0) navigator.vibrate?.(300);
  }, [left]);

  const shown = left ?? seconds;
  const over = left === 0;
  const status = left === null ? `Κράτημα ${seconds} δευτερόλεπτα` : left > 0 ? "Κρατήστε…" : "Τέλος κρατήματος";

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
      <div className="relative size-[min(4.75rem,22vw)] shrink-0" aria-hidden="true">
        <svg viewBox="0 0 100 100" className="size-full -rotate-90">
          <circle cx="50" cy="50" r={R} fill="none" strokeWidth="9" className="stroke-hairline" />
          <circle
            cx="50"
            cy="50"
            r={R}
            fill="none"
            strokeWidth="9"
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={over ? 0 : CIRCUMFERENCE * (1 - shown / seconds)}
            className="stroke-action transition-[stroke-dashoffset] duration-1000 ease-linear"
          />
        </svg>
        <span className={cx("absolute inset-0 flex items-center justify-center font-display leading-none", over ? "text-[min(2rem,9vw)] text-action" : "text-[min(1.75rem,8vw)]")}>
          {over ? "✓" : shown}
        </span>
      </div>
      <div className="flex min-w-0 flex-[1_1_min(10rem,50vw)] flex-col items-start gap-2">
        <p role="status" className="text-[1.05rem] font-bold">
          {status}
        </p>
        {/* A short word on the button (the status above says what it is about), the rest for screen readers. */}
        <button
          type="button"
          onClick={() => setLeft(seconds)}
          className="flex min-h-[3.25rem] cursor-pointer items-center gap-2 border-[3px] border-action bg-white px-4 py-1.5 text-left font-bold text-action hover:text-action-hover"
        >
          <span aria-hidden="true" className="text-[0.8em]">
            {left === null ? "▶" : "↺"}
          </span>
          {left === null ? (
            <span>
              Ξεκίνα <span className="sr-only">το κράτημα</span>
            </span>
          ) : (
            <span>
              Ξανά <span className="sr-only">από την αρχή</span>
            </span>
          )}
        </button>
      </div>
    </div>
  );
}
