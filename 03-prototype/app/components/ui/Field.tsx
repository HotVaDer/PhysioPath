// The frame every form field shares: a label that is always visible above the field, an optional hint,
// and a message that stays until the problem is fixed. The hint and message are linked to the field
// (aria-describedby), so screen readers read them together with it.
import { useId, type ReactNode } from "react";

import { AlertIcon } from "@/app/components/ui/icons";
import { cx } from "@/app/lib/cx";

export type FieldMessages = {
  hint?: ReactNode; // help shown under the label, e.g. "Μία οδηγία ανά γραμμή."
  error?: string; // something is wrong; shown in red with an icon
  missing?: boolean; // the physio didn't say this; shown in amber with the word "Λείπει"
};

export const MISSING_TEXT = "Λείπει: δεν αναφέρθηκε στη σημείωση";

// Ids and ARIA attributes for one field. The field element spreads `controlProps`.
export function useField(id: string | undefined, { hint, error, missing }: FieldMessages) {
  const autoId = useId();
  const fieldId = id ?? autoId;
  const hintId = hint ? `${fieldId}-hint` : undefined;
  const messageId = error || missing ? `${fieldId}-message` : undefined;
  return {
    ids: { fieldId, hintId, messageId },
    controlProps: {
      id: fieldId,
      "aria-describedby": cx(hintId, messageId) || undefined,
      "aria-invalid": error ? true : undefined,
    },
  };
}

// The state shows in the border and a thick left edge, but never alone: the message under the field
// says it in words too.
export function controlClasses({ error, missing }: FieldMessages, className?: string) {
  return cx(
    "w-full rounded-sm border bg-surface px-3 py-2 text-base text-foreground placeholder:text-muted",
    error ? "border-danger border-l-4" : missing ? "border-warning border-l-4 bg-warning-bg" : "border-border-strong",
    className,
  );
}

type FieldProps = FieldMessages & {
  label: ReactNode;
  ids: ReturnType<typeof useField>["ids"];
  children: ReactNode; // the input, textarea…
};

export function Field({ label, hint, error, missing, ids, children }: FieldProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={ids.fieldId} className="label-mono text-muted">
        {label}
      </label>
      {hint && (
        <p id={ids.hintId} className="text-base text-muted">
          {hint}
        </p>
      )}
      {children}
      {(error || missing) && (
        <p id={ids.messageId} className={cx("flex items-start gap-2 text-base font-semibold", error ? "text-danger" : "text-warning")}>
          <AlertIcon size={20} className="mt-0.5 shrink-0" />
          {error ?? MISSING_TEXT}
        </p>
      )}
    </div>
  );
}
