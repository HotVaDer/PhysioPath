import type { Metadata } from "next";

import { Gallery } from "@/app/ui/Gallery";

// Internal reference page (not part of the demo): the building blocks every page is made of,
// each with what it's for and where it's used. Internal, so it's in English; the examples are in Greek
// exactly as they appear in the app. Laid out like the portfolio: open sections, hairlines, mono labels.
export const metadata: Metadata = { title: "UI catalogue" };

export default function UiCataloguePage() {
  return (
    <div lang="en" className="mx-auto max-w-5xl px-4 sm:px-6">
      <header className="flex items-center justify-between py-5">
        <p className="flex items-center gap-3">
          <span aria-hidden="true" className="inline-grid h-7 w-9 -skew-x-10 place-items-center rounded-xs bg-primary font-extrabold text-on-primary italic">
            PP
          </span>
          <span className="label-mono">PhysioPath</span>
        </p>
        <p className="label-mono text-muted">Internal · not part of the app</p>
      </header>

      <main id="main" className="pt-12 pb-24 sm:pt-20">
        <h1 className="text-5xl leading-[0.95] font-extrabold tracking-tight italic sm:text-7xl">
          UI catalogue<span className="text-primary">.</span>
        </h1>
        <p className="mt-6 max-w-2xl text-lg text-muted">
          The pages of PhysioPath are built from these pieces. Each is written once in{" "}
          <code className="font-mono text-foreground">app/components/ui/</code>, so every page shares the same sizes, colours and
          accessibility rules. Switch your device between light and dark mode to see both themes.
        </p>
        <Gallery />
      </main>
    </div>
  );
}
