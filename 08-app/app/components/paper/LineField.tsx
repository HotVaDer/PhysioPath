// A form field: the label above, then a short hint, then a white box to type in, then the error.
// Built for people who don't use computers much: the label is dark and large, the box has a full
// border so it's clear where to tap, and the error says «Πρόβλημα:» in words, not just in red.
// Hints and errors are tied to the field (aria-describedby), so a screen reader reads them with it.
import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes } from "react";

import { cx } from "@/app/lib/cx";

type Common = {
  id: string;
  label: string;
  hint?: ReactNode;
  error?: string;
  width?: string; // Tailwind max-width for the box, sized to the answer (full width on a phone)
};

// The look of a box to type in. Exported for fields that aren't a LineField (e.g. the invite form).
export const fieldBox = (error?: string) =>
  cx(
    "min-h-[52px] w-full rounded-md bg-white px-3.5 text-xl text-ink",
    error ? "border-[3px] border-error" : "border-2 border-line",
  );

function Row({ id, label, hint, error, children }: Common & { children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-[19px] font-semibold text-ink">
        {label}
      </label>
      {hint && (
        <p id={`${id}-hint`} className="text-base text-muted">
          {hint}
        </p>
      )}
      {children}
      {error && (
        <p id={`${id}-error`} className="text-base font-semibold text-error">
          Πρόβλημα: {error}
        </p>
      )}
    </div>
  );
}

function described(id: string, hint?: ReactNode, error?: string) {
  return [hint && `${id}-hint`, error && `${id}-error`].filter(Boolean).join(" ") || undefined;
}

export function LineField({
  id,
  label,
  hint,
  error,
  width = "max-w-[480px]",
  className,
  ...input
}: Common & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <Row id={id} label={label} hint={hint} error={error}>
      <input
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={described(id, hint, error)}
        className={cx(fieldBox(error), width, className)}
        {...input}
      />
    </Row>
  );
}

export function LineSelect({
  id,
  label,
  hint,
  error,
  width = "max-w-[320px]",
  children,
  ...select
}: Common & SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <Row id={id} label={label} hint={hint} error={error}>
      <select
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={described(id, hint, error)}
        className={cx(fieldBox(error), "cursor-pointer", width)}
        {...select}
      >
        {children}
      </select>
    </Row>
  );
}
