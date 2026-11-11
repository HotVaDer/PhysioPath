// A row of measurements for the demo's timings: recording length, transcription and program time.
// A description list, so screen readers read each label with its value.
import type { ReactNode } from "react";

import { cx } from "@/app/lib/cx";

type Timing = {
  label: string; // e.g. "Μεταγραφή"
  value: ReactNode; // e.g. "1,8 δευτ."
  highlight?: boolean; // the number that matters most, shown in teal
};

export function TimingStrip({ items, className }: { items: Timing[]; className?: string }) {
  return (
    <dl className={cx("flex flex-wrap rounded-tile bg-surface-muted px-4", className)}>
      {items.map((item) => (
        <div key={item.label} className="mr-5 border-r border-border py-3 pr-5 last:mr-0 last:border-r-0 last:pr-0">
          <dt className="label text-muted">{item.label}</dt>
          <dd className={cx("mt-0.5 text-lg font-bold", item.highlight && "text-primary-text")}>{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}
