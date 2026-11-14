// A small card on the desk, for short things that aren't part of the registration form:
// signing in, "check your email" after signing in. Narrower than the form sheet, no binder tabs,
// no page numbers, so it never looks like registering again.
import type { ReactNode } from "react";

export function Card({ label, children, footer }: { label: string; children: ReactNode; footer?: ReactNode }) {
  return (
    <div className="px-3 py-8 sm:px-4 sm:py-16">
      <main
        id="main"
        className="relative mx-auto flex max-w-[520px] flex-col gap-5 bg-sheet px-6 pb-8 pt-7 shadow-[0_1px_0_#cfc6b4,0_18px_40px_-24px_rgba(43,36,32,0.45)] sm:px-10 sm:pb-10 sm:pt-9"
      >
        {/* A punched hole and a top rule, like an index card. Decoration only. */}
        <span aria-hidden="true" className="absolute left-1/2 top-3 h-2.5 w-2.5 -translate-x-1/2 rounded-full bg-desk" />
        <header className="flex items-baseline justify-between gap-3 border-b-[3px] border-double border-ink pb-3 text-[15px]">
          <span className="text-xl font-semibold italic">PhysioPath</span>
          <span className="font-typed text-[13px] font-bold tracking-[0.08em]">{label}</span>
        </header>
        {children}
        {footer && <div className="border-t border-hairline pt-4 text-base text-muted">{footer}</div>}
      </main>
    </div>
  );
}
