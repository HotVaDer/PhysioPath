// Multi-line text input (transcript, clinical note sections). It grows with its content
// (CSS field-sizing), so nothing hides behind a scrollbar.
import type { ComponentProps, ReactNode } from "react";

import { Field, controlClasses, useField, type FieldMessages } from "@/app/components/ui/Field";
import { cx } from "@/app/lib/cx";

export type TextAreaProps = Omit<ComponentProps<"textarea">, "children"> & FieldMessages & { label: ReactNode };

export function TextArea({ label, hint, error, missing, id, className, ...props }: TextAreaProps) {
  const { ids, controlProps } = useField(id, { hint, error, missing });
  return (
    <Field label={label} hint={hint} error={error} missing={missing} ids={ids}>
      <textarea {...props} {...controlProps} className={controlClasses({ error, missing }, cx("field-sizing-content min-h-24 leading-relaxed", className))} />
    </Field>
  );
}
