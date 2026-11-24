"use client";
// The demo's guided tour on every page except the board (where DemoGuide is): one green line on top
// saying what to do on this page, while the visitor follows step 1 (a session by voice: choose a patient,
// record, review, approve) and step 2 (on the program page: open the patient's phone screen).
// Reaching the program page after «Έγκριση» finishes step 1.
// After the tour (step 4), the pages of «Δείτε και αυτά» get a line too: «Πρότυπα», «Πείτε τα πρότυπά σας», and
// the recording page (start from a template). Opening «Πρότυπα» or «Πείτε τα πρότυπά σας» ticks it on the board.
import type { Route } from "next";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

import { demoText, type DemoLang } from "@/app/lib/demo/text";
import { TOUR_EVENT, loadTour, saveTour, type Tour } from "@/app/lib/demo/tour";

type SessionPage = "new" | "program" | "record" | "review";
type Page = SessionPage | "programPage" | "templates" | "dictate" | "other";

function pageOf(path: string): Page {
  if (path === "/notes/new") return "new";
  if (path === "/notes/program") return "program";
  if (path === "/notes/record") return "record";
  if (path === "/notes/review") return "review";
  if (path.startsWith("/programs/")) return "programPage";
  if (path === "/templates") return "templates";
  if (path === "/templates/dictate") return "dictate";
  return "other";
}

const isSession = (page: Page): page is SessionPage => page === "new" || page === "program" || page === "record" || page === "review";

export function DemoCoach({ lang, clinicId }: { lang: DemoLang; clinicId: string }) {
  const t = demoText(lang);
  const path = usePathname();
  const approved = useSearchParams().get("approved") === "1";
  const [tour, setTour] = useState<Tour | null>(null);
  const page = pageOf(path);

  useEffect(() => {
    let now = loadTour(clinicId);
    // Opening a session from anywhere is step 1, even if they skipped the intro.
    if (now.step === 0 && isSession(page)) now = { ...now, step: 1, since: new Date().toISOString() };
    // Straight from «Έγκριση»: step 1 is done, the patient's phone is next.
    if (now.step <= 1 && page === "programPage" && approved) now = { ...now, step: 2, since: new Date().toISOString() };
    // After the tour: «Πρότυπα» or «Πείτε τα πρότυπά σας» opened (a ✓ at the end of the tour).
    if (now.step === 4 && (page === "templates" || page === "dictate") && !now.seen?.includes(page))
      now = { ...now, seen: [...(now.seen ?? []), page] };
    saveTour(clinicId, now);
    setTour(now);
    const update = (event: Event) => setTour((event as CustomEvent<Tour>).detail);
    window.addEventListener(TOUR_EVENT, update);
    return () => window.removeEventListener(TOUR_EVENT, update);
  }, [clinicId, page, approved]);

  if (!tour || path === "/" || tour.step === 0) return null;
  // After the tour: only on the pages of «Δείτε και αυτά».
  const after =
    tour.step === 4 ? (page === "templates" ? t.coach.templates : page === "dictate" ? t.coach.dictate : page === "record" ? t.coach.recordTemplate : null) : null;
  if (tour.step === 4 && !after) return null;
  const line =
    after ??
    (tour.step === 1 && isSession(page)
      ? t.coach[page]
      : tour.step === 2 && page === "programPage"
        ? t.coach.programPage
        : t.coach.other);
  const backToBoard = after !== null || line === t.coach.other || page === "programPage";

  return (
    <aside aria-label={t.tourLabel} lang={lang} className="mb-5 flex flex-wrap items-center gap-x-4 gap-y-1 border-l-[6px] border-action bg-note-green px-4 py-3">
      <p className="flex-[1_1_320px] text-lg leading-[1.45]">
        <span className="font-bold text-action">
          {t.tourLabel} · {after ? t.extrasTitle : t.stepOf(tour.step, t.steps.length)}:
        </span>{" "}
        {line}
      </p>
      {backToBoard && (
        <Link href={"/" as Route} className="min-h-11 content-center font-semibold">
          {t.coach.back} <span aria-hidden="true">→</span>
        </Link>
      )}
    </aside>
  );
}
