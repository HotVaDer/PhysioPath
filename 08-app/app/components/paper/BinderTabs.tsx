// The coloured binder tabs beside the sheet: where you are in the form and what's done.
// Done tabs get ✓, the current one is dark, the rest keep their colour. On a phone they sit in a
// row above the sheet. Each tab is a link, so you can jump back to a finished section.
import type { Route } from "next";
import Link from "next/link";

import { cx } from "@/app/lib/cx";

export type Step = "you" | "clinic" | "rooms" | "team" | "sign";

const STEPS: { step: Step; mark: string; label: string; href: Route; colour: string }[] = [
  { step: "you", mark: "", label: "Εσείς", href: "/register", colour: "bg-tab-done" },
  { step: "clinic", mark: "§1", label: "Κλινική", href: "/register/clinic", colour: "bg-tab-blue" },
  { step: "rooms", mark: "§2", label: "Χώροι", href: "/register/rooms", colour: "bg-tab-pink" },
  { step: "team", mark: "§3", label: "Ομάδα", href: "/register/team", colour: "bg-tab-yellow" },
  { step: "sign", mark: "§4", label: "Υπογραφή", href: "/register/sign", colour: "bg-tab-violet" },
];

type Props = { current: Step; done: Partial<Record<Step, boolean>> };

export function BinderTabs({ current, done }: Props) {
  return (
    <nav aria-label="Ενότητες του δελτίου" className="w-full lg:w-auto lg:flex-[0_1_170px] lg:pt-[120px]">
      <ol className="flex gap-1.5 overflow-x-auto pb-0 lg:flex-col lg:overflow-visible">
        {STEPS.map(({ step, mark, label, href, colour }) => {
          const isCurrent = step === current;
          const status = isCurrent ? "τώρα" : done[step] ? "✓" : "";
          return (
            <li key={step} className="flex-[1_0_auto] lg:flex-none">
              <Link
                href={href}
                aria-current={isCurrent ? "step" : undefined}
                className={cx(
                  "flex min-h-[52px] flex-col justify-center rounded-t-xl px-3.5 py-1.5 leading-tight no-underline lg:rounded-l-none lg:rounded-r-xl",
                  isCurrent ? "bg-ink text-sheet hover:text-sheet" : cx(colour, "text-ink hover:text-ink"),
                )}
              >
                <span className="font-typed text-[13px] font-bold">
                  {[mark, status].filter(Boolean).join(isCurrent ? " · " : " ") || " "}
                  {done[step] && !isCurrent && <span className="sr-only"> (έγινε)</span>}
                </span>
                <span className="text-base">{label}</span>
              </Link>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
