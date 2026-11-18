"use client";
// Countdown for a hold the physio said («κρατήστε 10 δευτερόλεπτα»). The patient starts it when ready;
// a small ring empties around the seconds, a short vibration at the end where the phone supports it,
// and the state in words for screen readers. One row, so the set number stays the biggest thing.
import { useEffect, useState } from "react";

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
  const status = left === null ? `Κράτημα ${seconds} δευτερόλεπτα` : left > 0 ? "Κρατήστε…" : "Τέλος κρατήματος";

  return (
    <div className="flex items-center gap-4">
      <div className="relative size-[4.5rem] shrink-0" aria-hidden="true">
        <svg viewBox="0 0 100 100" className="size-full -rotate-90">
          <circle cx="50" cy="50" r={R} fill="none" strokeWidth="8" className="stroke-hairline" />
          <circle
            cx="50"
            cy="50"
            r={R}
            fill="none"
            strokeWidth="8"
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={CIRCUMFERENCE * (1 - shown / seconds)}
            className="stroke-action transition-[stroke-dashoffset] duration-1000 ease-linear"
          />
        </svg>
        <span className="absolute inset-0 flex items-center justify-center font-display text-[1.6rem]">{shown}</span>
      </div>
      <div className="flex flex-col items-start gap-1">
        <p role="status" className="font-bold">
          {status}
        </p>
        <button type="button" onClick={() => setLeft(seconds)} className="min-h-11 cursor-pointer text-action underline underline-offset-[3px] hover:text-ink">
          {left === null ? "Ξεκίνα το κράτημα" : "Ξανά από την αρχή"}
        </button>
      </div>
    </div>
  );
}
