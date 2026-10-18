// One-line text input with its label, hint and message (title, sets, reps…).
// For numbers pass inputMode="numeric" so phones show the number keypad.
import type { ComponentProps, ReactNode } from "react";

import { Field, controlClasses, useField, type FieldMessages } from "@/app/components/ui/Field";
import { cx } from "@/app/lib/cx";

type TextFieldProps = Omit<ComponentProps<"input">, "children"> & FieldMessages & { label: ReactNode };

export function TextField({ label, hint, error, missing, id, className, ...props }: TextFieldProps) {
  const { ids, controlProps } = useField(id, { hint, error, missing });
  return (
    <Field label={label} hint={hint} error={error} missing={missing} ids={ids}>
      <input type="text" {...props} {...controlProps} className={controlClasses({ error, missing }, cx("min-h-10", className))} />
    </Field>
  );
}
