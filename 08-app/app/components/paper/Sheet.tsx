// One sheet of paper on the desk, for the sign-up pages: the logo at the top, an optional
// «Βήμα 1 από 3» with a simple bar, the page's content, and a help line at the bottom.
// No form jargon (no §, binder tabs or page numbers): people who don't use computers much found
// those confusing (review 2026-11-16).
// Sized so a whole step fits one laptop screen (1280×650 and up) without scrolling: tight padding,
// and `wide` sheets that use the width of a laptop for two columns (2026-11-16).
import type { ReactNode } from "react";

import { HelpLine } from "@/app/components/paper/HelpLine";
import { Logo } from "@/app/components/paper/Logo";
import { cx } from "@/app/lib/cx";

type Props = {
  children: ReactNode;
  // Something on the right of the header (e.g. "Έχετε λογαριασμό; Είσοδος").
  headerAside?: ReactNode;
  // Where they are in sign-up: «Βήμα 2 από 3».
  step?: { n: number; of: number };
  // Wider on a laptop, for pages laid out in two columns there (one column on a phone).
  wide?: boolean;
};

export function Sheet({ children, headerAside, step, wide = false }: Props) {
  return (
    // Centred on the screen, up/down as well as left/right: equal space above and below the card
    // (symmetry), on a phone as on a laptop. A card taller than the screen simply starts at the top.
    <div className="desk-pattern flex min-h-dvh flex-col justify-center px-3 py-3 sm:px-4 sm:py-5 lg:py-6">
      <main
        id="main"
        // As tall as its content (no fixed height), so the main button is always right after the
        // last field, on a phone, a laptop or a big screen.
        className={cx(
          "mx-auto flex w-full flex-col bg-sheet px-5 pb-5 pt-4 shadow-[0_1px_0_#cfc6b4,0_18px_40px_-24px_rgba(43,36,32,0.45)] sm:px-10 sm:pb-7 sm:pt-6",
          wide ? "max-w-[720px] lg:max-w-[1000px]" : "max-w-[720px]",
        )}
      >
        <header className="flex flex-wrap items-center justify-between gap-x-6 gap-y-1 border-b-2 border-hairline pb-2.5 text-base">
          <Logo />
          {/* The step sits in the header when nothing else is there (saves a line), else under it. */}
          {headerAside ?? (step && <StepBar n={step.n} of={step.of} />)}
        </header>

        {headerAside && step && (
          <div className="pt-3">
            <StepBar n={step.n} of={step.of} />
          </div>
        )}

        <div className={cx("flex flex-col", headerAside && step ? "pt-3" : "pt-4")}>{children}</div>

        <HelpLine />
      </main>
    </div>
  );
}

// «Βήμα 2 από 3» in words (what a screen reader reads) and a bar of 3 pieces beside it (decoration).
// Also used by the staff pages (a voice note is 2 steps).
export function StepBar({ n, of }: { n: number; of: number }) {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
      <p className="font-semibold">
        Βήμα {n} από {of}
      </p>
      <div aria-hidden="true" className="flex w-[160px] gap-1.5">
        {Array.from({ length: of }, (_, i) => (
          <span key={i} className={cx("h-2.5 flex-1 rounded-full", i < n ? "bg-action" : "bg-hairline")} />
        ))}
      </div>
    </div>
  );
}

// The title at the top of a sheet and one plain sentence under it.
export function SectionHeading({ title, note }: { title: string; note?: ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <h1 className="font-display text-[28px] leading-[1.15] sm:text-[32px]">{title}</h1>
      {note && <p className="text-muted">{note}</p>}
    </div>
  );
}
