// "Βήμα 2 από 3" indicator for the physio's pages. Round markers like the set markers on the patient
// screen: done = filled teal with a ✓, now = thick teal ring, to come = thin grey ring.
// Done steps say "ολοκληρώθηκε" to screen readers; the current step has aria-current.
import { CheckIcon } from "@/app/components/ui/icons";
import { cx } from "@/app/lib/cx";

type StepperProps = {
  steps: string[]; // e.g. ["Ηχογράφηση", "Έλεγχος", "Έγκριση"]
  current: number; // index of the current step, starting at 0
};

export function Stepper({ steps, current }: StepperProps) {
  return (
    <div>
      <p className="label text-muted">
        Βήμα {current + 1} από {steps.length}
      </p>
      <ol className="mt-3 flex flex-wrap gap-x-6 gap-y-3">
        {steps.map((step, i) => {
          const done = i < current;
          const isCurrent = i === current;
          return (
            <li key={step} aria-current={isCurrent ? "step" : undefined} className="flex items-center gap-3">
              <span
                aria-hidden="true"
                className={cx(
                  "flex size-10 shrink-0 items-center justify-center rounded-full border-3 font-bold",
                  done && "border-primary bg-primary text-on-primary",
                  isCurrent && "border-primary text-foreground",
                  !done && !isCurrent && "border-2 border-border-strong text-muted",
                )}
              >
                {done ? <CheckIcon size={20} /> : i + 1}
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
