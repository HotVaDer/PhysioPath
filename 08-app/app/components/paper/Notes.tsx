// Small paper pieces used across the sheets: the alert slip, the violet stamp, the stapled attachment.
import type { ReactNode } from "react";

import { cx } from "@/app/lib/cx";

// Something went wrong with the whole form (not one field): a pink slip read out at once.
export function FormAlert({ children }: { children?: ReactNode }) {
  if (!children) return null;
  return (
    <p role="alert" className="bg-tab-pink px-4 py-3 font-semibold text-ink">
      {children}
    </p>
  );
}

// «ΚΑΤΑΤΕΘΗΚΕ»: the rubber stamp on a filed form («ΕΓΚΡΙΘΗΚΕ» on an approved program).
// Decoration: the page says the same in words.
export function Stamp({
  date,
  number,
  animate = false,
  className,
  word = "ΚΑΤΑΤΕΘΗΚΕ",
  top = "PHYSIOPATH",
}: {
  date: string;
  number?: string;
  animate?: boolean;
  className?: string;
  word?: string;
  top?: string;
}) {
  return (
    <div
      aria-hidden="true"
      className={cx(
        "w-[230px] rotate-[-8deg] rounded-[10px] border-4 border-stamp p-2 text-center text-stamp opacity-90 mix-blend-multiply",
        animate && "stamp-in",
        className,
      )}
    >
      <span className="flex flex-col items-center gap-0.5 rounded-[5px] border-[1.5px] border-stamp px-1.5 py-2">
        <span className="font-typed text-[11px] font-bold tracking-[0.12em]">{top}</span>
        <span className="font-display text-[30px] leading-none tracking-[0.06em]">{word}</span>
        <span className="font-typed text-sm font-bold">
          {date}
          {number && ` · ${number}`}
        </span>
      </span>
    </div>
  );
}

// A smaller sheet stapled to the form («Συνημμένο Α»).
export function Attachment({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="relative ml-2 mt-2 max-w-[520px] self-start rotate-[-1.2deg] border border-hairline bg-white px-6 pb-5 pt-5 shadow-[0_10px_24px_-18px_rgba(43,36,32,0.6)]">
      <svg width="44" height="14" viewBox="0 0 44 14" fill="none" aria-hidden="true" className="absolute -top-1.5 left-5">
        <path d="M2 12V4h40v8" stroke="#8A8178" strokeWidth="2.5" strokeLinejoin="round" />
      </svg>
      <p className="font-typed text-sm font-bold">{label}</p>
      {children}
    </div>
  );
}
