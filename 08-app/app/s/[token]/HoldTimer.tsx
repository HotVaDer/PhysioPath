"use client";
// Countdown for a hold the physio said («κρατήστε 10 δευτερόλεπτα»), laid out as on the canvas board
// «Patient · hold countdown»: a big ring with the seconds in the middle; beside it (so a whole exercise
// fits one phone screen) the state in words and the button to start (or start again). The patient starts it when ready. A short
// vibration at the end where the phone supports it. Paper look: green ring on a hairline track, ink
// numbers, square button.
import { useEffect, useState } from "react";

const R = 86;
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
  const status =
    left === null
      ? "Πατήστε όταν είστε έτοιμοι"
      : left > 0
        ? "Κρατήστε…"
        : "Τέλος κρατήματος";

  return (
    <div className="flex w-full items-center gap-4">
      {/* The ring: as big as the screen allows (capped on a small phone), the seconds very large. */}
      <div
        className="relative size-[min(8.5rem,38vw)] flex-none"
        aria-hidden="true"
      >
        <svg viewBox="0 0 200 200" className="size-full -rotate-90">
          <circle
            cx="100"
            cy="100"
            r={R}
            fill="none"
            strokeWidth="14"
            className="stroke-hairline"
          />
          <circle
            cx="100"
            cy="100"
            r={R}
            fill="none"
            strokeWidth="14"
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={CIRCUMFERENCE * (1 - shown / seconds)}
            className="stroke-action transition-[stroke-dashoffset] duration-1000 ease-linear"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-display text-[min(3.6rem,16vw)] leading-[0.9]">
            {shown}
          </span>
          <span className="text-[min(0.68rem,3vw)] font-bold text-muted">
            δευτερόλεπτα
          </span>
        </div>
      </div>
      <div className="flex min-w-0 flex-1 flex-col items-start gap-2 text-left">
        <p
          role="status"
          className="min-h-[1.5rem] text-[1.05rem] leading-snug font-bold"
        >
          {status}
        </p>
        <button
          type="button"
          onClick={() => setLeft(seconds)}
          className="flex min-h-[3rem] w-full cursor-pointer items-center justify-center gap-2.5 border-[3px] border-action bg-white px-4 text-[1.05rem] font-bold text-action hover:text-action-hover"
        >
          <span aria-hidden="true" className="text-[0.85em]">
            {left === null ? "▶" : "↺"}
          </span>
          {left === null ? `Ξεκίνα · ${seconds}″` : "Ξανά"}
          <span className="sr-only">
            {left === null ? "το κράτημα" : "από την αρχή"}
          </span>
        </button>
      </div>
    </div>
  );
}
