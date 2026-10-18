"use client";
// Countdown for a hold the physio said ("κρατήστε 10 δευτερόλεπτα"). The patient starts it when ready;
// big numbers, a short vibration at the end where phones support it, and the end announced to screen readers.
import { useEffect, useState } from "react";

import { Button } from "@/app/components/ui/Button";

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

  return (
    <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3">
      {left === null ? (
        <Button size="xl" onClick={() => setLeft(seconds)}>
          Ξεκίνα το κράτημα · {seconds}″
        </Button>
      ) : (
        <>
          <p className="font-mono text-6xl font-bold tabular-nums" aria-hidden={left > 0}>
            {left > 0 ? left : "✓"}
          </p>
          <p role="status" className="text-xl font-semibold">
            {left > 0 ? "Κρατήστε…" : "Τέλος κρατήματος"}
          </p>
          <Button variant="ghost" onClick={() => setLeft(seconds)}>
            Ξανά
          </Button>
        </>
      )}
    </div>
  );
}
