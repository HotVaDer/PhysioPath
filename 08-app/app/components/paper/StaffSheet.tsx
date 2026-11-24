// The frame of every page for the clinic's staff (home, voice note, review, approved, settings):
// a plain top bar (logo, «Αίθουσα», «Νέα συνεδρία», «Ασθενείς», «Πρότυπα», «Κλινική», the open clinic with «Αλλαγή», who is signed in,
// «Αποσύνδεση») and one sheet
// of paper under it, with «Βήμα n από m» where a page is a step of something.
// Same plain look as sign-up (2026-11-17): no folder tabs, red margin, double rules, «Σελ.», capital
// titles, stapled or tilted slips. Section titles are plain words; boxes are flat and coloured.
import type { Route } from "next";
import Link from "next/link";
import { Suspense, type ReactNode } from "react";

import { DemoCoach } from "@/app/components/demo/DemoCoach";
import { DemoStrip } from "@/app/components/demo/DemoStrip";
import { Logo } from "@/app/components/paper/Logo";
import { demoText } from "@/app/lib/demo/text";
import { StepBar } from "@/app/components/paper/Sheet";
import { TabLink } from "@/app/components/paper/TabLink";
import { SignOut } from "@/app/components/paper/SignOut";
import { cx } from "@/app/lib/cx";
import type { Profile } from "@/app/lib/onboarding/session";
import { BOARD_TAB, CLINIC_TAB, WORK_TAB } from "@/app/lib/tabs";

export type StaffTab = "board" | "new" | "patients" | "templates" | "clinic";

// tab: which browser tab the link belongs in (two-tab way of working, app/lib/tabs.ts).
const LINKS: { id: StaffTab; href: Route; label: string; physioOnly?: boolean; tab?: string }[] = [
  { id: "board", href: "/", label: "Αίθουσα", tab: BOARD_TAB },
  { id: "new", href: "/notes/new", label: "Νέα συνεδρία", physioOnly: true, tab: WORK_TAB },
  { id: "patients", href: "/patients", label: "Ασθενείς", physioOnly: true, tab: WORK_TAB },
  { id: "templates", href: "/templates", label: "Πρότυπα", physioOnly: true, tab: WORK_TAB },
  { id: "clinic", href: "/settings", label: "Κλινική", tab: CLINIC_TAB },
];

const ROLE_LABELS: Record<Profile["role"], string> = { owner: "Υπεύθυνη/ος", physio: "Φυσιοθεραπευτής", assistant: "Βοηθός" };

type Props = {
  children: ReactNode;
  // demo: a demo clinic («Δοκιμάστε το») shows the yellow strip on top of every page.
  profile: Pick<Profile, "role" | "full_name"> & Partial<Pick<Profile, "clinic_name" | "demo" | "clinic_id">>;
  current?: StaffTab; // which link in the top bar is this page
  step?: { n: number; of: number }; // «Βήμα 1 από 2» (the voice note)
  width?: "narrow" | "wide";
};

export function StaffSheet({ children, profile, current, step, width = "narrow" }: Props) {
  const links = LINKS.filter((link) => !link.physioOnly || profile.role !== "assistant");
  return (
    // The desk with the faint «Φ» marks, as on welcome, sign-up and sign-in (globals.css .desk-pattern).
    <div className="desk-pattern flex min-h-dvh flex-col">
      {profile.demo && <DemoStrip demo={profile.demo} />}
      <header className="border-b-2 border-hairline bg-sheet">
        {/* The same width on every page (not the sheet's), so the bar never jumps between one and two lines. */}
        <div className="mx-auto flex max-w-[1360px] flex-wrap items-center gap-x-6 gap-y-1 px-4 py-2 sm:px-6">
          <TabLink href="/" tab={BOARD_TAB} className="no-underline" aria-label="PhysioPath, αρχική">
            <Logo />
          </TabLink>
          <nav aria-label="Κύρια πλοήγηση" className="order-last w-full sm:order-none sm:w-auto">
            {/* On a phone the five links stay on one line (smaller), scrolling sideways if a screen is narrower still. */}
            <ul className="flex gap-x-0.5 overflow-x-auto sm:flex-wrap sm:gap-x-1 sm:overflow-visible">
              {links.map((link) => (
                <li key={link.id}>
                  <TabLink
                    href={link.href}
                    tab={link.tab}
                    aria-current={link.id === current ? "page" : undefined}
                    className={cx(
                      "flex min-h-[52px] items-center border-b-4 px-1.5 text-[16px] whitespace-nowrap no-underline sm:px-3.5 sm:text-[19px]",
                      link.id === current
                        ? "border-action font-bold text-ink hover:text-ink"
                        : "border-transparent text-action hover:border-hairline hover:text-ink",
                    )}
                  >
                    {link.label}
                  </TabLink>
                </li>
              ))}
            </ul>
          </nav>
          <div className="ml-auto flex flex-wrap items-center gap-x-4 text-base">
            {/* The clinic open right now; «Αλλαγή» lists the person's clinics (/clinics). Not in a demo: the
                yellow strip says what this is, and a visitor has nothing to switch to. */}
            {profile.clinic_name && !profile.demo && (
              <span className="flex flex-wrap items-center gap-x-2">
                <span className="font-semibold">{profile.clinic_name}</span>
                <Link href="/clinics" aria-label="Αλλαγή κλινικής" className="min-h-11 content-center">
                  Αλλαγή
                </Link>
              </span>
            )}
            {!profile.demo && (
              <span>
                {profile.full_name} <span className="text-muted">· {ROLE_LABELS[profile.role]}</span>
              </span>
            )}
            <SignOut className="" label={profile.demo ? demoText(profile.demo.lang).signOut : undefined} />
          </div>
        </div>
      </header>

      <div className="flex-1 px-3 pb-12 pt-4 sm:px-4 sm:pt-6">
        <main
          id="main"
          className={cx(
            "mx-auto flex min-w-0 flex-col bg-sheet px-5 pb-8 pt-6 shadow-[0_1px_0_#cfc6b4,0_18px_40px_-24px_rgba(43,36,32,0.45)] sm:px-10 sm:pb-10 sm:pt-8",
            width === "wide" ? "max-w-[1360px]" : "max-w-[1060px]",
          )}
        >
          {/* The demo's guided tour: what to do on this page (not on the board, which has the full tour). */}
          {profile.demo && profile.clinic_id && (
            <Suspense fallback={null}>
              <DemoCoach lang={profile.demo.lang} clinicId={profile.clinic_id} />
            </Suspense>
          )}
          {step && (
            <div className="pb-4">
              <StepBar n={step.n} of={step.of} />
            </div>
          )}
          {children}
        </main>
      </div>
    </div>
  );
}

// The title of one part of a page («Ηχογράφηση», «Η κλινική σημείωση»), with one plain sentence under it.
export function PartTitle({ id, children, note }: { id?: string; children: ReactNode; note?: ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <h2 id={id} className="font-display text-[26px] leading-tight sm:text-[28px]">
        {children}
      </h2>
      {note && <p className="text-muted">{note}</p>}
    </div>
  );
}

// A flat coloured box for something to notice: yellow = questions for you, green = done / what we fixed,
// pink = a problem, white = something to copy or keep.
export function Panel({
  children,
  tint = "white",
  labelledBy,
  className,
}: {
  children: ReactNode;
  tint?: "white" | "yellow" | "green" | "pink";
  labelledBy?: string;
  className?: string;
}) {
  const look = {
    white: "border-2 border-hairline bg-white",
    yellow: "bg-tab-yellow",
    green: "bg-note-green",
    pink: "bg-tab-pink",
  }[tint];
  return (
    <section aria-labelledby={labelledBy} className={cx("flex flex-col gap-2 rounded-md px-4 py-3.5 sm:px-5", look, className)}>
      {children}
    </section>
  );
}

export function PanelTitle({ id, children }: { id?: string; children: ReactNode }) {
  return (
    <h2 id={id} className="text-[19px] font-bold">
      {children}
    </h2>
  );
}
