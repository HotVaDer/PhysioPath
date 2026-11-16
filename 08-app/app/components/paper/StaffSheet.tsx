// A sheet for the clinic's staff (not the registration form): folder tabs on top for the main pages,
// then the paper with the red margin rule, a header and an optional page number.
// Canvas: boards PRBoard, PRNew, PRReview, PRApproved on the «Χαρτιά κλινικής · η αίθουσα» page.
import type { Route } from "next";
import Link from "next/link";
import type { ReactNode } from "react";

import { Logo } from "@/app/components/paper/Logo";
import { cx } from "@/app/lib/cx";
import type { Profile } from "@/app/lib/onboarding/session";

export type StaffTab = "board" | "new";

const TABS: { id: StaffTab; href: Route; label: string; tint: string; physioOnly?: boolean }[] = [
  { id: "board", href: "/", label: "Αίθουσα", tint: "bg-tab-blue" },
  { id: "new", href: "/notes/new", label: "Νέα σημείωση", tint: "bg-tab-yellow", physioOnly: true },
];

const ROLE_LABELS: Record<Profile["role"], string> = { owner: "Υπεύθυνη/ος", physio: "Φυσιοθεραπευτής", assistant: "Βοηθός" };

type Props = {
  children: ReactNode;
  profile: Pick<Profile, "role" | "full_name">;
  current?: StaffTab;
  // The words on the right of the sheet's header, e.g. «ΦΩΝΗΤΙΚΗ ΣΗΜΕΙΩΣΗ · 16.11.2026».
  title: ReactNode;
  page?: { n: number; of: number };
  width?: "narrow" | "wide";
};

export function StaffSheet({ children, profile, current, title, page, width = "narrow" }: Props) {
  const tabs = TABS.filter((tab) => !tab.physioOnly || profile.role !== "assistant");
  return (
    <div className="px-3 pb-16 pt-5 sm:px-4 sm:pt-7">
      <div className={cx("mx-auto flex flex-col", width === "wide" ? "max-w-[1360px]" : "max-w-[1060px]")}>
        <nav aria-label="Κύρια πλοήγηση" className="flex flex-wrap items-end justify-between gap-x-5 gap-y-2 pl-3 sm:pl-5">
          <ul className="flex flex-wrap gap-1.5">
            {tabs.map((tab) => (
              <li key={tab.id}>
                <Link
                  href={tab.href}
                  aria-current={tab.id === current ? "page" : undefined}
                  className={cx(
                    "flex min-h-[52px] items-center rounded-t-xl px-5 text-[17px] text-ink no-underline hover:text-ink",
                    tab.id === current ? "bg-ink text-sheet hover:text-sheet" : tab.tint,
                  )}
                >
                  {tab.label}
                </Link>
              </li>
            ))}
          </ul>
          <p className="mb-2.5 text-base">
            {profile.full_name} · {ROLE_LABELS[profile.role]}
          </p>
        </nav>

        <main
          id="main"
          className="relative flex min-w-0 flex-col bg-sheet px-5 pb-8 pt-8 shadow-[0_1px_0_#cfc6b4,0_18px_40px_-24px_rgba(43,36,32,0.45)] sm:pb-9 sm:pl-24 sm:pr-12 sm:pt-10"
        >
          {/* The red double margin rule of a real form. Decoration only. */}
          <span aria-hidden="true" className="absolute inset-y-0 left-[68px] hidden w-1 border-x border-margin sm:block" />
          <header className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 border-b-[3px] border-double border-ink pb-3.5 text-base">
            <Logo />
            <span className="font-display text-[17px] tracking-[0.04em]">{title}</span>
          </header>
          <div className="flex flex-col pt-6 sm:pt-8">{children}</div>
          {page && (
            <p className="mt-8 text-center font-typed text-sm text-muted">
              Σελ. {page.n} / {page.of}
            </p>
          )}
        </main>
      </div>
    </div>
  );
}

// A numbered part of a sheet: «Α. Ασθενής», «ΙΙ. Κλινική σημείωση · ΓεΣΥ».
export function PartHeading({ id, mark, children, note }: { id?: string; mark: string; children: ReactNode; note?: ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <h2 id={id} className="flex flex-wrap items-baseline gap-x-3 font-display text-[26px] leading-tight sm:text-[30px]">
        <span className="text-[30px] sm:text-[34px]">{mark}</span> {children}
      </h2>
      {note && <p className="text-muted">{note}</p>}
    </div>
  );
}

// A stapled paper slip (questions, fixes, the note). tint: yellow = questions, green = done/ok.
export function Slip({ children, tint = "white", labelledBy, className }: { children: ReactNode; tint?: "white" | "yellow" | "green" | "pink"; labelledBy?: string; className?: string }) {
  const bg = { white: "bg-white", yellow: "bg-tab-yellow", green: "bg-note-green", pink: "bg-tab-pink" }[tint];
  return (
    <section
      aria-labelledby={labelledBy}
      className={cx("relative max-w-[660px] self-start border border-hairline px-5 pb-3.5 pt-5 shadow-[0_10px_24px_-18px_rgba(43,36,32,0.6)]", bg, className)}
    >
      <svg width="44" height="14" viewBox="0 0 44 14" fill="none" aria-hidden="true" className="absolute -top-1.5 left-5">
        <path d="M2 12V4h40v8" stroke="#8A8178" strokeWidth="2.5" strokeLinejoin="round" />
      </svg>
      {children}
    </section>
  );
}

export function SlipTitle({ id, children }: { id?: string; children: ReactNode }) {
  return (
    <h2 id={id} className="mb-1.5 font-typed text-sm font-bold tracking-[0.06em]">
      {children}
    </h2>
  );
}
