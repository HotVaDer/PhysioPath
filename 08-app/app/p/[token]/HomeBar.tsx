"use client";
// The tools above the home program: the «Φ», «Αα» (opens the three text sizes, remembered on this
// device, the same choice as on the session screen) and «Εκτύπωση». Hidden on paper (PatientSheet).
// Always one line, so it never takes a big part of a small screen: at big text sizes on a phone the
// «Φ», and on the narrowest phones the printer icon, make room; the words stay.
import { useState } from "react";

import { LogoMark } from "@/app/components/paper/Logo";
import { TextSizeControl, useTextSize } from "@/app/components/patient/TextSize";
import { cx } from "@/app/lib/cx";
import { PrinterIcon } from "@/app/p/[token]/icons";

const tool = "flex min-h-[3rem] cursor-pointer items-center gap-2 border-2 px-3 text-[0.95rem] font-bold";

export function HomeBar() {
  const [open, setOpen] = useState(false);
  const [textSize, changeTextSize] = useTextSize();

  return (
    <>
      {/* The «Φ» is decoration: when the bar is too narrow for it at this text size (a phone with
          «Μεγάλα»), it steps aside so «Αα» and «Εκτύπωση» keep one line and their words. */}
      <LogoMark className="size-[2rem] @max-[16rem]:hidden" />
      <button
        type="button"
        aria-expanded={open}
        aria-controls={open ? "text-size" : undefined}
        aria-label="Αα, μέγεθος γραμμάτων"
        onClick={() => setOpen((o) => !o)}
        className={cx(tool, "ml-auto", open ? "border-ink bg-white text-ink" : "border-line bg-sheet text-ink")}
      >
        Αα
      </button>
      <button type="button" onClick={() => window.print()} className={cx(tool, "border-action bg-sheet text-action hover:text-action-hover")}>
        {/* Decoration too: on the narrowest phones at the biggest size only the word stays. */}
        <PrinterIcon className="size-[1.2rem] @max-[13.5rem]:hidden" />
        Εκτύπωση
      </button>
      {open && (
        <div id="text-size" className="basis-full pt-1 pb-2">
          <TextSizeControl value={textSize} onChange={changeTextSize} />
        </div>
      )}
    </>
  );
}
