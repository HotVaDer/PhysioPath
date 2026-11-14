// One sheet of the registration form lying on the desk: the paper, the red margin rule, the
// header, the binder tabs beside it and the page number at the bottom.
// Canvas: boards PF1You … PF7Done on the «Χαρτιά κλινικής · μία ενότητα ανά σελίδα» page.
import type { ReactNode } from "react";

type Props = {
  children: ReactNode;
  // The binder tabs (BinderTabs), shown to the right of the sheet; on a phone above it.
  tabs?: ReactNode;
  // The cover shows the big title; the other sheets show it small in the header.
  cover?: { subtitle: string };
  // Something on the right of the header (e.g. "Έχετε λογαριασμό; Σύνδεση").
  headerAside?: ReactNode;
  // "Σελ. 2 / 5"
  page?: { n: number; of: number };
};

export function Sheet({ children, tabs, cover, headerAside, page }: Props) {
  return (
    <div className="px-3 pb-16 pt-6 sm:px-4 sm:pt-10">
      <div className="mx-auto flex max-w-[1060px] flex-row-reverse flex-wrap items-start justify-center">
        {tabs}
        <main
          id="main"
          // As tall as its content (no fixed height), so the main button is always right after the
          // last field, on a phone, a laptop or a big screen.
          className="relative flex min-w-0 max-w-[860px] flex-[1_1_640px] flex-col bg-sheet px-5 pb-8 pt-8 shadow-[0_1px_0_#cfc6b4,0_18px_40px_-24px_rgba(43,36,32,0.45)] sm:pb-10 sm:pl-24 sm:pr-14 sm:pt-12"
        >
          {/* The red double margin rule of a real form. Decoration only. */}
          <span aria-hidden="true" className="absolute inset-y-0 left-[68px] hidden w-1 border-x border-margin sm:block" />

          {cover ? (
            <header className="flex flex-col gap-4 border-b-[3px] border-double border-ink pb-5">
              <div className="flex flex-wrap justify-between gap-x-6 gap-y-2 text-[15px]">
                <span className="text-xl font-semibold italic">PhysioPath</span>
                {headerAside}
              </div>
              <h1 className="text-center font-display text-[34px] leading-[1.05] tracking-[0.03em] sm:text-[46px]">
                ΔΕΛΤΙΟ ΕΓΓΡΑΦΗΣ ΚΛΙΝΙΚΗΣ
              </h1>
              <p className="text-center italic text-muted">{cover.subtitle}</p>
            </header>
          ) : (
            <header className="flex flex-wrap justify-between gap-x-6 gap-y-2 border-b-[3px] border-double border-ink pb-3.5 text-[15px]">
              <span className="text-xl font-semibold italic">PhysioPath</span>
              {headerAside ?? <span className="font-display text-[17px] tracking-[0.04em]">ΔΕΛΤΙΟ ΕΓΓΡΑΦΗΣ ΚΛΙΝΙΚΗΣ</span>}
            </header>
          )}

          <div className="flex flex-col pt-6 sm:pt-8">{children}</div>

          {page && (
            <p className="mt-8 text-center font-typed text-sm text-muted sm:mt-10">
              Σελ. {page.n} / {page.of}
            </p>
          )}
        </main>
      </div>
    </div>
  );
}

// The § heading at the top of a sheet: "§1 Στοιχεία κλινικής" and a one-line note under it.
export function SectionHeading({ mark, title, note }: { mark?: string; title: string; note?: string }) {
  return (
    <div className="flex flex-col gap-2">
      <h1 className="flex flex-wrap items-baseline gap-x-3.5 font-display text-[30px] leading-[1.1] sm:text-[36px]">
        {mark && <span className="text-[38px] sm:text-[46px]">{mark}</span>}
        {mark && " "}
        {title}
      </h1>
      {note && <p className="italic text-muted">{note}</p>}
    </div>
  );
}
