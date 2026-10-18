// "Please wait" indicator: the portfolio's five start lights, coming on one by one.
// The text says what is happening, so it still makes sense when the lights don't move
// (reduce-motion setting: they stay lit) or can't be seen.
import type { ReactNode } from "react";

import { cx } from "@/app/lib/cx";

// Just a small spinning ring, for inside a button. Decorative: the button says it's busy.
export function SpinnerRing({ className }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cx("inline-block size-5 shrink-0 animate-spin rounded-full border-3 border-current border-t-transparent", className)}
    />
  );
}

type SpinnerProps = {
  label: ReactNode; // what is happening, e.g. "Γράφεται το πρόγραμμα…"
  children?: ReactNode; // optional extra line, e.g. how long it usually takes
};

export function Spinner({ label, children }: SpinnerProps) {
  return (
    <div role="status" className="flex flex-col items-center gap-4 py-6 text-center">
      <span className="start-lights" aria-hidden="true">
        <span />
        <span />
        <span />
        <span />
        <span />
      </span>
      <p className="text-lg font-semibold">{label}</p>
      {children && <p className="max-w-prose text-muted">{children}</p>}
    </div>
  );
}
