// A small card on the desk, for short things that aren't sign-up: signing in, "check your email"
// after signing in. Narrower than the sign-up sheet and without steps, so it never looks like
// registering again.
import type { ReactNode } from "react";

import { HelpLine } from "@/app/components/paper/HelpLine";
import { Logo } from "@/app/components/paper/Logo";
import { cx } from "@/app/lib/cx";

// `wide`: wider on a laptop, for a card laid out in two columns there (one column on a phone).
export function Card({ label, children, footer, wide = false }: { label?: string; children: ReactNode; footer?: ReactNode; wide?: boolean }) {
  return (
    // Centred on the screen, up/down as well as left/right (symmetry); a taller card starts at the top.
    <div className="desk-pattern flex min-h-dvh flex-col justify-center px-3 py-3 sm:px-4 sm:py-6 lg:py-8">
      <main
        id="main"
        className={cx(
          "mx-auto flex w-full flex-col gap-4 bg-sheet px-5 pb-6 pt-4 shadow-[0_1px_0_#cfc6b4,0_18px_40px_-24px_rgba(43,36,32,0.45)] sm:px-9 sm:pb-7 sm:pt-6",
          wide ? "max-w-[520px] lg:max-w-[900px]" : "max-w-[520px]",
        )}
      >
        <header className="flex flex-wrap items-center justify-between gap-3 border-b-2 border-hairline pb-2.5 text-base">
          <Logo />
          {label && <span className="text-muted">{label}</span>}
        </header>
        {children}
        {footer && <div className="border-t border-hairline pt-3 text-base text-muted">{footer}</div>}
        <HelpLine />
      </main>
    </div>
  );
}
