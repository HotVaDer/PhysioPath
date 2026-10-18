// Top of each physio page: where they are in starting a patient's session (when they're in that flow),
// then the page title in the portfolio's big italic style with an orange full stop, and an optional line.
import type { ReactNode } from "react";

import { Stepper } from "@/app/components/ui/Stepper";
import { cx } from "@/app/lib/cx";

const STEPS = ["Ηχογράφηση", "Έλεγχος", "Έναρξη"];

type PageHeaderProps = {
  step?: 0 | 1 | 2; // left out on pages outside the flow (room board, end of session)
  title: string;
  children?: ReactNode; // one or two sentences under the title
};

export function PageHeader({ step, title, children }: PageHeaderProps) {
  return (
    <div className="mb-12">
      {step !== undefined && <Stepper steps={STEPS} current={step} />}
      <h1 className={cx("text-5xl leading-[0.95] font-extrabold tracking-tight italic sm:text-6xl", step !== undefined && "mt-10")}>
        {title}
        <span aria-hidden="true" className="text-primary">
          .
        </span>
      </h1>
      {children && <div className="mt-4 max-w-2xl text-lg text-muted">{children}</div>}
    </div>
  );
}
