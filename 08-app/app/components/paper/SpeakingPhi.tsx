"use client";
// The big Φ on the welcome page, acting out the headline «Μιλάτε. Το PhysioPath γράφει.» (chosen
// 2026-11-18 from three ideas): a sound wave "speaks" inside the oval, goes quiet, and then three
// exercises are typed underneath, as on a patient's program. Then it starts again.
// Decoration only (aria-hidden): the headline says the same in words. With «reduce motion» on the
// device it stands still: a small wave and the three lines already written.
import { useEffect, useRef, useState } from "react";

const PROGRAM = ["Έλξεις μονόζυγου · 3 × 8", "Βυθίσεις · 3 × 10", "Καθίσματα · 3 × 12"];
const TOTAL = PROGRAM.join("").length;

// One loop, in ms: speak, write, then hold the written lines.
const SPEAK = 2600;
const WRITE = 3600;
const HOLD = 1800;
const CYCLE = SPEAK + WRITE + HOLD;

// The wave: 9 bars each side of the green line (k = −9…9 without 0), taller near the middle.
const BAR_W = 7;
const BAR_GAP = 6;
const BARS = Array.from({ length: 19 }, (_, i) => i - 9).filter((k) => k !== 0);

function barHeight(k: number, loud: number) {
  return 8 + loud * 150 * (1 - Math.abs(k) / 10);
}

export function SpeakingPhi() {
  const bars = useRef<(SVGRectElement | null)[]>([]);
  const [typed, setTyped] = useState(0); // letters written so far
  const [writing, setWriting] = useState(false); // show the cursor

  useEffect(() => {
    // Heights go straight onto the bars, so the wave doesn't re-render React 60 times a second.
    const setBars = (loud: (i: number) => number) =>
      bars.current.forEach((rect, i) => {
        if (!rect) return;
        const h = barHeight(BARS[i], loud(i));
        rect.setAttribute("y", String(210 - h / 2));
        rect.setAttribute("height", String(h));
      });

    if (matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setBars(() => 0.25);
      setTyped(TOTAL);
      return;
    }

    const start = performance.now();
    let frame = 0;
    const tick = (now: number) => {
      const t = (now - start) % CYCLE;
      if (t < SPEAK) {
        // gets louder and then quieter, each bar wobbling at its own pace
        const loud = Math.sin((Math.PI * t) / SPEAK);
        setBars((i) => loud * (0.35 + 0.65 * Math.abs(Math.sin(now / 130 + i * 1.7) * Math.sin(now / 310 + i * 0.6))));
        setTyped(0);
        setWriting(false);
      } else {
        setBars(() => 0);
        setTyped(Math.min(TOTAL, Math.floor(((t - SPEAK) / WRITE) * TOTAL)));
        setWriting(t < SPEAK + WRITE);
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, []);

  // Share the typed letters out over the three lines.
  let left = typed;
  const lines = PROGRAM.map((line) => {
    const shown = line.slice(0, Math.max(0, left));
    left -= line.length;
    return shown;
  });
  const last = lines.findLastIndex(Boolean);

  return (
    <div aria-hidden="true" className="flex w-full max-w-[260px] flex-col items-center gap-2">
      <svg viewBox="20 14 380 404" className="h-auto w-full overflow-visible">
        {/* its shadow on the paper */}
        <ellipse cx="214" cy="404" rx="120" ry="10" fill="var(--color-ink)" opacity="0.07" />
        <ellipse cx="210" cy="210" rx="150" ry="118" fill="none" stroke="var(--color-ink)" strokeWidth="9" />
        <g fill="var(--color-action)">
          {BARS.map((k, i) => (
            <rect
              key={k}
              ref={(el) => {
                bars.current[i] = el;
              }}
              x={210 + k * (BAR_W + BAR_GAP) - BAR_W / 2}
              y={206}
              width={BAR_W}
              height={8}
              rx={BAR_W / 2}
            />
          ))}
        </g>
        <line x1="210" y1="22" x2="210" y2="398" stroke="var(--color-action)" strokeWidth="13" strokeLinecap="round" />
      </svg>

      {/* room for all three lines from the start, so nothing below jumps */}
      <div className="min-h-[78px] w-full font-typed text-[14px] leading-[1.45]">
        {lines.map(
          (shown, i) =>
            shown && (
              <div key={i} className="overflow-hidden whitespace-nowrap border-b border-hairline py-0.5">
                {shown}
                {writing && i === last && (
                  <span className="ml-0.5 inline-block h-[1em] w-2 bg-action align-[-2px]" />
                )}
              </div>
            ),
        )}
      </div>
    </div>
  );
}
