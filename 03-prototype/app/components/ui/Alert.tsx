// A message box that stays on the page until it's no longer true. It replaces the old toasts,
// which vanished before slow readers could finish them.
// Errors use role="alert" (read out at once); the others use role="status" (read out politely).
// A tag in words ("Σφάλμα", "Προσοχή"…) says what kind of message it is, so colour is never the only clue.
import type { ReactNode } from "react";

import { cx } from "@/app/lib/cx";

type Tone = "info" | "success" | "warning" | "danger";

const TONES: Record<Tone, { tag: string; edge: string; tagColours: string; title: string }> = {
  info: { tag: "Πληροφορία", edge: "border-l-foreground", tagColours: "bg-foreground text-background", title: "text-foreground" },
  success: { tag: "Έτοιμο", edge: "border-l-success", tagColours: "bg-success text-background", title: "text-success" },
  warning: { tag: "Προσοχή", edge: "border-l-warning", tagColours: "bg-warning text-background", title: "text-warning" },
  danger: { tag: "Σφάλμα", edge: "border-l-danger", tagColours: "bg-danger text-background", title: "text-danger" },
};

type AlertProps = {
  tone?: Tone;
  title: ReactNode; // the message in a few words, e.g. "Δεν ήταν δυνατή η μεταγραφή"
  children?: ReactNode; // what happened and what to do next
  action?: ReactNode; // e.g. an "Αναίρεση" button
  className?: string;
};

export function Alert({ tone = "info", title, children, action, className }: AlertProps) {
  const t = TONES[tone];
  return (
    <div
      role={tone === "danger" ? "alert" : "status"}
      className={cx("flex flex-wrap items-center gap-x-4 gap-y-3 border-l-4 py-1.5 pl-4", t.edge, className)}
    >
      <div className="min-w-0 flex-1">
        <p className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <span className={cx("label-mono rounded-xs px-2 py-0.5", t.tagColours)}>{t.tag}</span>{" "}
          <span className={cx("font-bold", t.title)}>{title}</span>
        </p>
        {children && <div className="mt-1">{children}</div>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
