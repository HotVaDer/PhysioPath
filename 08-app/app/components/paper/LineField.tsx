// A field on a printed form: the label on the left, the answer typed on a line.
// Hints and errors sit under the line and are tied to the field (aria-describedby), so a screen
// reader reads them with it. An error also marks the line red and the field "invalid".
import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes } from "react";

import { cx } from "@/app/lib/cx";

type Common = {
  id: string;
  label: string;
  number?: string; // "1.1"
  hint?: ReactNode;
  error?: string;
  width?: string; // Tailwind max-width for the line, sized to the answer
};

function Row({ id, label, number, hint, error, children }: Common & { children: ReactNode }) {
  return (
    <div className="flex flex-wrap items-baseline gap-x-3.5 gap-y-1">
      <label htmlFor={id} className="text-base text-muted sm:flex-[0_0_210px]">
        {/* The space is real text, so screen readers say "1.3 Τηλέφωνο", not "1.3Τηλέφωνο". */}
        {number && `${number} `}
        {label}
      </label>
      {children}
      {hint && (
        <p id={`${id}-hint`} className="basis-full text-[15px] italic text-muted sm:pl-[224px]">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} className="basis-full text-base font-semibold text-error sm:pl-[224px]">
          {error}
        </p>
      )}
    </div>
  );
}

function described(id: string, hint?: ReactNode, error?: string) {
  return [hint && `${id}-hint`, error && `${id}-error`].filter(Boolean).join(" ") || undefined;
}

const lineClass = (error?: string) =>
  cx(
    "min-h-11 w-full flex-[1_1_220px] border-0 border-b-2 bg-transparent px-1 font-typed text-xl text-ink",
    error ? "border-error" : "border-line",
  );

export function LineField({
  id,
  label,
  number,
  hint,
  error,
  width = "max-w-[420px]",
  className,
  ...input
}: Common & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <Row id={id} label={label} number={number} hint={hint} error={error}>
      <input
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={described(id, hint, error)}
        className={cx(lineClass(error), width, className)}
        {...input}
      />
    </Row>
  );
}

export function LineSelect({
  id,
  label,
  number,
  hint,
  error,
  width = "max-w-[240px]",
  children,
  ...select
}: Common & SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <Row id={id} label={label} number={number} hint={hint} error={error}>
      <select
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={described(id, hint, error)}
        className={cx(lineClass(error), "rounded-none", width)}
        {...select}
      >
        {children}
      </select>
    </Row>
  );
}
