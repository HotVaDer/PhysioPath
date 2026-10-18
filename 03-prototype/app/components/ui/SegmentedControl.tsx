// Choose one of a few options shown side by side (note language, text size).
// Built from real radio buttons in a fieldset, so arrow keys and screen readers work without extra code.
// The chosen option is filled orange and gets a ✓, so it doesn't rely on colour alone.
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
      <legend className="label-mono mb-1.5 text-muted">{legend}</legend>
      {/* One row always; on a narrow phone the option text wraps inside its segment instead. */}
      <div className="inline-flex max-w-full divide-x divide-border-strong rounded-sm border border-border-strong">
        {options.map((option) => {
          const checked = option.value === value;
          return (
            <label
              key={option.value}
              className="relative flex min-h-10 min-w-0 cursor-pointer items-center justify-center gap-2 px-3 py-1.5 text-center leading-tight font-semibold sm:px-4 text-foreground first:rounded-l-sm last:rounded-r-sm hover:bg-surface-muted has-checked:bg-primary has-checked:text-on-primary has-focus-visible:outline-3 has-focus-visible:outline-offset-2 has-focus-visible:outline-focus"
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
