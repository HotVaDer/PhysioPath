"use client";
// The green buttons of the paper look. SubmitButton knows when its form is being sent (it
// shows "Αποθήκευση…" and can't be pressed twice); PaperLink is a link that looks the same.
import type { Route } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { useFormStatus } from "react-dom";

import { cx } from "@/app/lib/cx";

const green =
  "inline-flex min-h-14 items-center gap-2.5 bg-action px-6 text-[19px] font-bold text-white no-underline hover:bg-action-hover hover:text-white disabled:cursor-wait disabled:opacity-80";

export function SubmitButton({ children, pending: pendingLabel }: { children: ReactNode; pending: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={cx(green, "cursor-pointer self-start")}>
      {pending ? pendingLabel : children}
    </button>
  );
}

// A small text-style submit button (e.g. «Ξανά αποστολή») that says what it's doing while it works.
export function QuietSubmit({ children, pending: pendingLabel }: { children: ReactNode; pending: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="min-h-11 cursor-pointer text-base text-action underline underline-offset-[3px] hover:text-ink disabled:cursor-wait disabled:no-underline disabled:text-muted"
    >
      {pending ? pendingLabel : children}
    </button>
  );
}

export function PaperLink({ href, children }: { href: Route; children: ReactNode }) {
  return (
    <Link href={href} className={cx(green, "self-start")}>
      {children}
    </Link>
  );
}

// The row at the bottom of a sheet: the main button and an optional quiet link next to it.
export function Actions({ children }: { children: ReactNode }) {
  return <div className="flex flex-wrap items-center gap-x-6 gap-y-3.5 pt-4">{children}</div>;
}
