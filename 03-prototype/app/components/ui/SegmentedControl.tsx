// Choose one of a few options shown side by side (note language, text size).
// Built from real radio buttons in a fieldset, so arrow keys and screen readers work without extra code.
// Each option is a pill; the chosen one is filled teal and gets a ✓, so it doesn't rely on colour alone.
import { useId, type ReactNode } from "react";

import { CheckIcon } from "@/app/components/ui/icons";

type Option<T extends string> = { value: T; label: ReactNode };

type SegmentedControlProps<T extends string> = {
  legend: ReactNode; // the question, always visible, e.g. "Γλώσσα κλινικής σημείωσης"
  options: Option<T>[];
  value: T;
  onChange: (value: T) => void;
  name?: string;
};

export function SegmentedControl<T extends string>({ legend, options, value, onChange, name }: SegmentedControlProps<T>) {
  const autoName = useId();
  return (
    <fieldset className="min-w-0">{/* fieldsets default to their content's width; this lets it fit a phone */}
      <legend className="label mb-2 text-muted">{legend}</legend>
      <div className="flex max-w-full flex-wrap gap-2">
        {options.map((option) => {
          const checked = option.value === value;
          return (
            <label
              key={option.value}
              className="relative flex min-h-11 min-w-0 cursor-pointer items-center justify-center gap-1.5 rounded-full border-2 border-border-strong bg-surface px-3 py-1.5 text-center sm:px-4 leading-tight font-bold text-foreground hover:bg-surface-muted has-checked:border-primary has-checked:bg-primary has-checked:text-on-primary has-focus-visible:outline-3 has-focus-visible:outline-offset-3 has-focus-visible:outline-focus"
            >
              <input
                type="radio"
                name={name ?? autoName}
                value={option.value}
                checked={checked}
                onChange={() => onChange(option.value)}
                className="sr-only"
              />
              {checked && <CheckIcon size={18} className="shrink-0" />}
              {option.label}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
