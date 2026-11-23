"use client";
// The green buttons of the paper look. SubmitButton knows when its form is being sent (it
// shows "Αποθήκευση…" and can't be pressed twice); PaperLink is a link that looks the same (or outlined).
import type { Route } from "next";
import type { ReactNode } from "react";
import { useFormStatus } from "react-dom";

import { TabLink } from "@/app/components/paper/TabLink";
import { cx } from "@/app/lib/cx";

const green =
  "inline-flex min-h-14 items-center gap-2.5 bg-action px-6 text-[19px] font-bold text-white no-underline hover:bg-action-hover hover:text-white disabled:cursor-wait disabled:opacity-80";

// className: extra classes where one place needs it smaller (e.g. the demo strip on a phone).
export function SubmitButton({ children, pending: pendingLabel, className }: { children: ReactNode; pending: string; className?: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={cx(green, "cursor-pointer self-start", className)}>
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

// The same size as the green button, but outlined: for the second of two equal choices
// (e.g. «Είσοδος» next to «Εγγραφή» on the welcome page).
const outline =
  "inline-flex min-h-14 items-center gap-2.5 border-[3px] border-action bg-white px-6 text-[19px] font-bold text-action no-underline hover:bg-note-green hover:text-action";

export function PaperLink({
  href,
  children,
  variant = "green",
  className,
  tab,
}: {
  href: Route;
  children: ReactNode;
  variant?: "green" | "outline";
  className?: string;
  tab?: string; // the browser tab it belongs in (TabLink, app/lib/tabs.ts)
}) {
  return (
    <TabLink href={href} tab={tab} className={cx(variant === "green" ? green : outline, "self-start", className)}>
      {children}
    </TabLink>
  );
}

// The row at the bottom of a sheet: the main button and an optional quiet link next to it.
export function Actions({ children }: { children: ReactNode }) {
  return <div className="flex flex-wrap items-center gap-x-6 gap-y-3 pt-1">{children}</div>;
}
