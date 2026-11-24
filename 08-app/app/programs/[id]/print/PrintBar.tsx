"use client";
// The tools above the printed sheet (not printed): back to the program, «Κανονικά» / «Μεγάλα γράμματα»
// (links, so the size is in the address and a refresh keeps it) and «Εκτύπωση».
import type { Route } from "next";
import Link from "next/link";

import { cx } from "@/app/lib/cx";
import type { PaperSize } from "@/app/p/[token]/HomeProgramLetter";
import { PrinterIcon } from "@/app/p/[token]/icons";

const SIZES: { size: PaperSize; label: string }[] = [
  { size: "normal", label: "Κανονικά" },
  { size: "large", label: "Μεγάλα γράμματα" },
];

export function PrintBar({ programId, size }: { programId: string; size: PaperSize }) {
  const here = `/programs/${programId}/print`;
  return (
    <>
      <Link href={`/programs/${programId}` as Route} className="min-h-[3rem] content-center text-[0.95rem]">
        <span aria-hidden="true">←</span> Πίσω στο πρόγραμμα
      </Link>
      <nav aria-label="Μέγεθος γραμμάτων στο χαρτί" className="ml-auto flex gap-1">
        {SIZES.map((s) => (
          <Link
            key={s.size}
            href={(s.size === "large" ? `${here}?size=large` : here) as Route}
            aria-current={s.size === size ? "page" : undefined}
            replace
            className={cx(
              "flex min-h-[3rem] items-center border-2 px-3 text-[0.95rem] font-bold no-underline",
              s.size === size ? "border-ink bg-white text-ink hover:text-ink" : "border-line bg-sheet text-action",
            )}
          >
            {s.label}
          </Link>
        ))}
      </nav>
      <button
        type="button"
        onClick={() => window.print()}
        className="flex min-h-[3rem] cursor-pointer items-center gap-2 bg-action px-4 text-[0.95rem] font-bold text-white hover:bg-action-hover"
      >
        <PrinterIcon className="size-[1.2rem]" />
        Εκτύπωση
      </button>
    </>
  );
}
