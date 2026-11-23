"use client";
// The demo's guided tour on every page except the board (where DemoGuide is): one green line on top
// saying what to do on this page, while the visitor follows step 1 (a session by voice: choose a patient,
// record, review, approve) and step 2 (on the program page: open the patient's phone screen).
// Reaching the program page after «Έγκριση» finishes step 1.
import type { Route } from "next";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

import { demoText, type DemoLang } from "@/app/lib/demo/text";
import { TOUR_EVENT, loadTour, saveTour, type Tour } from "@/app/lib/demo/tour";

type Page = "new" | "program" | "record" | "review" | "programPage" | "other";

function pageOf(path: string): Page {
  if (path === "/notes/new") return "new";
  if (path === "/notes/program") return "program";
  if (path === "/notes/record") return "record";
  if (path === "/notes/review") return "review";
  if (path.startsWith("/programs/")) return "programPage";
  return "other";
}

export function DemoCoach({ lang, clinicId }: { lang: DemoLang; clinicId: string }) {
  const t = demoText(lang);
  const path = usePathname();
  const approved = useSearchParams().get("approved") === "1";
  const [tour, setTour] = useState<Tour | null>(null);
  const page = pageOf(path);

  useEffect(() => {
    let now = loadTour(clinicId);
    // Opening a session from anywhere is step 1, even if they skipped the intro.
    if (now.step === 0 && page !== "other" && page !== "programPage") now = { step: 1 };
    // Straight from «Έγκριση»: step 1 is done, the patient's phone is next.
    if (now.step <= 1 && page === "programPage" && approved) now = { step: 2, since: new Date().toISOString() };
    saveTour(clinicId, now);
    setTour(now);
    const update = (event: Event) => setTour((event as CustomEvent<Tour>).detail);
    window.addEventListener(TOUR_EVENT, update);
    return () => window.removeEventListener(TOUR_EVENT, update);
  }, [clinicId, page, approved]);

  if (!tour || path === "/" || tour.step === 0 || tour.step === 4) return null;
  const line =
    tour.step === 1 && page !== "other" && page !== "programPage"
      ? t.coach[page]
      : tour.step === 2 && page === "programPage"
        ? t.coach.programPage
        : t.coach.other;
  const backToBoard = line === t.coach.other || page === "programPage";

  return (
    <aside aria-label={t.tourLabel} lang={lang} className="mb-5 flex flex-wrap items-center gap-x-4 gap-y-1 border-l-[6px] border-action bg-note-green px-4 py-3">
      <p className="flex-[1_1_320px] text-lg leading-[1.45]">
        <span className="font-bold text-action">
          {t.tourLabel} · {t.stepOf(tour.step, t.steps.length)}:
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
