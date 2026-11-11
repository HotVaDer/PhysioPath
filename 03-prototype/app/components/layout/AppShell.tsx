// The frame around the physio's pages: header with the name, a link to the room, a reminder that this is a demo, and <main>.
import Link from "next/link";
import type { ReactNode } from "react";

import { BrandMark } from "@/app/components/layout/BrandMark";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <>
      <header className="border-b border-border bg-surface">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-x-6 gap-y-2 px-4 py-4 sm:px-6">
          <Link href="/" className="flex items-center gap-3 no-underline">
            <BrandMark />
            <span className="font-bold">PhysioPath</span>
          </Link>
          <nav aria-label="Κύριο μενού" className="flex flex-wrap items-center gap-x-6 gap-y-2">
            <Link href="/" className="font-semibold text-primary-text underline underline-offset-4 hover:decoration-2">
              Η αίθουσα
            </Link>
            <span className="text-muted">Demo · φανταστικοί ασθενείς</span>
          </nav>
        </div>
      </header>
      <main id="main" className="mx-auto max-w-5xl px-4 pt-10 pb-16 sm:px-6 sm:pt-14">
        {children}
      </main>
    </>
  );
}
