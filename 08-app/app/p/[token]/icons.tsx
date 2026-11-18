// Line icons for the home program, drawn in the text colour. Decoration only (aria-hidden): the word
// next to each one says the same, so nothing depends on the picture (or on colour, on a grey printer).
import { cx } from "@/app/lib/cx";

type IconProps = { className?: string };

const line = { fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round" } as const;

export function PhoneIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={cx("flex-none", className)} {...line}>
      <path d="M5 3h3.5l1.8 4.6-2.3 1.5a11.5 11.5 0 0 0 6.9 6.9l1.5-2.3L21 15.5V19a2 2 0 0 1-2 2A16 16 0 0 1 3 5a2 2 0 0 1 2-2z" />
    </svg>
  );
}

export function CalendarIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={cx("flex-none", className)} {...line}>
      <rect x="3" y="5" width="18" height="16" rx="1.5" />
      <path d="M3 10h18M8 3v4M16 3v4" />
      <path d="M8 14.5h2.5M13.5 14.5H16M8 17.5h2.5" />
    </svg>
  );
}

// «Αποφύγετε»: a circle with a bar through it.
export function AvoidIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={cx("flex-none", className)} {...line} strokeWidth={2.4}>
      <circle cx="12" cy="12" r="9" />
      <path d="M5.6 5.6l12.8 12.8" />
    </svg>
  );
}

export function PrinterIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={cx("flex-none", className)} {...line}>
      <path d="M6 9V3h12v6" />
      <rect x="3" y="9" width="18" height="8" rx="1" />
      <path d="M6 14h12v7H6z" />
    </svg>
  );
}
