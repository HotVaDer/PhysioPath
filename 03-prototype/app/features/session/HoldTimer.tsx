"use client";
// Countdown for a hold the physio said ("κρατήστε 10 δευτερόλεπτα"). The patient starts it when ready;
// a ring empties with big numbers inside, a short vibration at the end where phones support it,
// and the state announced to screen readers in words.
import { useEffect, useState } from "react";

import { Button } from "@/app/components/ui/Button";
import { PlayIcon, RestartIcon } from "@/app/components/ui/icons";

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
  const status = left === null ? "Πατήστε όταν είστε έτοιμοι" : left > 0 ? "Κρατήστε…" : "Τέλος κρατήματος";

  return (
    <div className="flex w-full flex-col items-center gap-3">
      <div className="relative size-[10rem]" aria-hidden="true">
        <svg viewBox="0 0 200 200" className="size-full -rotate-90">
          <circle cx="100" cy="100" r={R} fill="none" strokeWidth="14" className="stroke-surface-muted" />
          <circle
            cx="100"
            cy="100"
            r={R}
            fill="none"
            strokeWidth="14"
            strokeLinecap="round"
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={CIRCUMFERENCE * (1 - shown / seconds)}
            className="stroke-primary transition-[stroke-dashoffset] duration-1000 ease-linear"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-[4.2rem] leading-[0.9] font-bold">{shown}</span>
          <span className="label text-muted">δευτερόλεπτα</span>
        </div>
      </div>
      <p role="status" className="min-h-[1.4em] text-[1.1rem] font-bold">
        {status}
      </p>
      <Button variant="outline" size="xl" icon={left === null ? <PlayIcon size={24} /> : <RestartIcon size={24} />} onClick={() => setLeft(seconds)} className="w-full">
        {left === null ? `Ξεκίνα το κράτημα · ${seconds}″` : "Ξανά από την αρχή"}
      </Button>
    </div>
  );
}
