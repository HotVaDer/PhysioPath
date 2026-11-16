"use client";
// A number with big − and + buttons around it (beds, exercise stations), so nobody has to type a
// number on a phone keyboard. The buttons say what they do to a screen reader («Κρεβάτια: ένα
// περισσότερο»), and the number is read out when it changes.
import { cx } from "@/app/lib/cx";

const button =
  "h-[52px] w-[52px] cursor-pointer rounded-md border-2 border-ink bg-white font-typed text-[26px] text-ink hover:bg-note-green disabled:cursor-not-allowed disabled:opacity-40";

type Props = {
  label: string; // what is being counted, e.g. «Κρεβάτια στην Αίθουσα 1»
  value: number;
  onChange: (n: number) => void;
  min?: number;
  max?: number;
  className?: string;
  describedBy?: string;
};

export function Counter({ label, value, onChange, min = 0, max = 40, className, describedBy }: Props) {
  return (
    <span role="group" aria-label={label} aria-describedby={describedBy} className={cx("flex items-center gap-3", className)}>
      <button type="button" aria-label={`${label}: ένα λιγότερο`} className={button} disabled={value <= min} onClick={() => onChange(value - 1)}>
        −
      </button>
      <output aria-live="polite" className="min-w-10 text-center font-typed text-[28px] font-bold">
        {value}
      </output>
      <button type="button" aria-label={`${label}: ένα περισσότερο`} className={button} disabled={value >= max} onClick={() => onChange(value + 1)}>
        +
      </button>
    </span>
  );
}
