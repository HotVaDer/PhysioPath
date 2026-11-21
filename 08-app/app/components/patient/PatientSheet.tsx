// The sheet a patient reads at home: one sheet of paper on the desk with the «Φ» marks, like Sheet and
// Card, made for the home program /p/<token>. How it differs from Sheet and Card:
// - The clinic writes to the patient, so the clinic's letterhead is the header (no PhysioPath logo and no
//   sign-up help line), under a thin green top edge, like a clinic's letter paper.
// - Sizes are in rem (Tailwind's spacing is rem too), so the text-size choice (TextSize.tsx) makes the
//   whole sheet bigger. The page sets the root size with TEXT_SIZE_SCRIPT, as /s/<token> does. Only the
//   sheet's side padding on a phone is capped by the screen width, so big text keeps room for words.
// - On paper: no desk, shadow, bar or buttons; the sheet is the page, at one fixed text size whatever
//   «Αα» says, with A4 margins.
// The session screen /s/<token> uses the same sheet with two extras: the bar stays at the top while
// scrolling (stickyBar) and the one thing to press stays at the bottom, under the thumb (bottomBar).
import type { ReactNode } from "react";

import { cx } from "@/app/lib/cx";

const PRINT_CSS = "@media print{html{font-size:14px!important}}@page{size:A4;margin:14mm 15mm}";

type Props = {
  // Who the letter is from: the clinic's name, city and phone. Above a rule at the top of the sheet.
  letterhead: ReactNode;
  children: ReactNode;
  // Tools above the sheet (text size, print). Not printed.
  bar?: ReactNode;
  // The closing at the bottom of the sheet, under a rule (who approved the program and when).
  footer?: ReactNode;
  // Wider on a laptop, for a page laid out in two columns there. Without it the sheet stays one
  // comfortable column at every screen size.
  wide?: boolean;
  // The bar stays at the top of the screen while the page scrolls.
  stickyBar?: boolean;
  // Stays at the bottom of the screen (under the thumb), or right under a short sheet's end.
  bottomBar?: ReactNode;
};

export function PatientSheet({ letterhead, children, bar, footer, wide = false, stickyBar = false, bottomBar }: Props) {
  const hasBottomBar = Boolean(bottomBar);
  return (
    <div className={cx("desk-pattern min-h-dvh text-[1rem] leading-normal break-words print:min-h-0", hasBottomBar && "flex flex-col")}>
      <style>{PRINT_CSS}</style>

      {bar && (
        // A size container, so the bar's pieces can tell when one line has no room left (in rem, so it
        // follows «Αα»): then the decoration gives way and the buttons stay on one line.
        <header className={cx("@container border-b-2 border-hairline bg-sheet print:hidden", stickyBar && "sticky top-0 z-10")}>
          <div className={cx("mx-auto flex max-w-xl flex-wrap items-center gap-x-2 gap-y-2 px-[min(1rem,4vw)] py-2", wide && "lg:max-w-[58rem]")}>{bar}</div>
        </header>
      )}

      {/* On a phone the desk shows only as a thin edge (in px, so big text doesn't widen it). */}
      <div className={cx("px-[8px] pt-3 pb-10 sm:px-4 sm:pt-8 sm:pb-14 print:p-0", hasBottomBar && "flex-1 pb-4 sm:pb-6")}>
        <main
          id="main"
          // As tall as its content, and one comfortable column wide (36rem grows with the text size, so a
          // line keeps about the same number of words); `wide` on a laptop for two columns.
          className={cx(
            "mx-auto flex max-w-xl flex-col border-t-[6px] border-action bg-sheet px-[min(1.25rem,5vw)] pt-5 pb-7 shadow-[0_1px_0_#cfc6b4,0_18px_40px_-24px_rgba(43,36,32,0.45)] sm:px-10 sm:pt-7 sm:pb-9 print:max-w-none print:border-t-0 print:p-0 print:shadow-none",
            wide && "lg:max-w-[58rem] lg:px-12",
          )}
        >
          <header className="border-b-2 border-hairline pb-4 print:pb-3">{letterhead}</header>

          {/* A size container: the page uses two columns only when the sheet has room for them at the
              text size chosen (container sizes in rem follow «Αα»), never squeezing the words. */}
          <div className="@container flex flex-col gap-8 pt-5 print:gap-5 print:pt-3">{children}</div>

          {footer && <footer className="mt-9 border-t-2 border-hairline pt-5 print:mt-6 print:pt-3">{footer}</footer>}
        </main>
      </div>

      {hasBottomBar && (
        // Sticky rather than fixed: it keeps its own room at the end of the page, so nothing hides under it.
        <div className="@container sticky bottom-0 z-10 border-t-2 border-hairline bg-sheet pb-[env(safe-area-inset-bottom)] shadow-[0_-10px_24px_-18px_rgba(43,36,32,0.45)] print:hidden">
          <div className="mx-auto max-w-xl px-[min(1rem,4vw)]">{bottomBar}</div>
        </div>
      )}
    </div>
  );
}
