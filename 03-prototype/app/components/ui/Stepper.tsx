// "Βήμα 2 από 3" indicator for the physio's pages, styled like the portfolio's timing strip:
// one cell per step between hairlines, the current one with an orange tag.
// Done steps show a ✓ and say "ολοκληρώθηκε" to screen readers; the current step has aria-current.
import { CheckIcon } from "@/app/components/ui/icons";
import { cx } from "@/app/lib/cx";

type StepperProps = {
  steps: string[]; // e.g. ["Ηχογράφηση", "Έλεγχος", "Έγκριση"]
  current: number; // index of the current step, starting at 0
};

export function Stepper({ steps, current }: StepperProps) {
  return (
    <div>
      <p className="label-mono text-muted">
        Βήμα {current + 1} από {steps.length}
      </p>
      <ol className="mt-2 flex flex-wrap border-y border-border">
        {steps.map((step, i) => {
          const done = i < current;
          const isCurrent = i === current;
          return (
            <li
              key={step}
              aria-current={isCurrent ? "step" : undefined}
              className="mr-5 flex items-center gap-3 border-r border-border py-3 pr-5 last:mr-0 last:border-r-0 last:pr-0"
            >
              <span
                aria-hidden="true"
                className={cx(
                  "label-mono flex h-7 min-w-9 items-center justify-center rounded-xs px-1.5",
                  done && "bg-success-bg text-success",
                  isCurrent && "bg-primary text-on-primary",
                  !done && !isCurrent && "border border-border-strong text-muted",
                )}
              >
                {done ? <CheckIcon size={16} /> : String(i + 1).padStart(2, "0")}
              </span>
              <span className={cx(isCurrent ? "font-bold text-foreground" : "text-muted")}>{step}</span>
              {done && (
                <>
                  {" "}
                  <span className="sr-only">(ολοκληρώθηκε)</span>
                </>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
