"use client";
// «Ξενάγηση» on the board of a demo clinic: a short introduction, then one step at a time, each with one
// big button that does it (app/lib/demo/tour.ts has the steps). On the other pages DemoCoach carries on
// with a line saying what to do there. Steps tick themselves off as things happen on the live board
// (BOARD_EVENT from RoomBoard): a new call from the patient's phone, then «Το είδα» on it.
import type { Route } from "next";
import Link from "next/link";
import { useEffect, useState } from "react";

import { QuietSubmit, SubmitButton } from "@/app/components/paper/Buttons";
import { BOARD_EVENT } from "@/app/components/board/RoomBoard";
import type { BoardCard } from "@/app/lib/board/board";
import { cx } from "@/app/lib/cx";
import { leaveDemo, refillDemo } from "@/app/lib/demo/actions";
import { demoText, type DemoLang } from "@/app/lib/demo/text";
import { TOUR_EVENT, loadTour, saveTour, type Tour, type TourStep } from "@/app/lib/demo/tour";

type Props = {
  lang: DemoLang;
  clinicId: string;
  initialCards: BoardCard[];
  patientCard: { id: string; href: string } | null; // the newest card not calling: whose phone step 2 opens
  // When the clinic's newest program was approved. One approved after step 1 started finishes step 1, even
  // without the coach. The demo's own programs are days old, so after «Από την αρχή» step 1 waits for a new one.
  lastProgramAt: string | null;
};

export const bigButton =
  "inline-flex min-h-14 items-center justify-center gap-2.5 bg-action px-6 text-[19px] font-bold text-white no-underline hover:bg-action-hover hover:text-white";
const quiet = "min-h-11 cursor-pointer text-base text-action underline underline-offset-[3px] hover:text-ink";

// On a phone one tab is everything: a link meant for a new tab opens here instead (Back returns).
const sameTabOnPhone = (event: React.MouseEvent<HTMLAnchorElement>) => {
  if (window.matchMedia?.("(max-width: 639px)").matches) event.currentTarget.removeAttribute("target");
};

export function DemoGuide({ lang, clinicId, initialCards, patientCard, lastProgramAt }: Props) {
  const t = demoText(lang);
  const [cards, setCards] = useState(initialCards);
  const [tour, setTour] = useState<Tour>({ step: 0 });

  const go = (next: Tour) => {
    setTour(next);
    saveTour(clinicId, next);
  };

  // Where this browser left the tour (after the first render: the server can't see it), and changes
  // saved by the other tour component.
  useEffect(() => {
    setTour(loadTour(clinicId));
    const update = (event: Event) => setTour((event as CustomEvent<Tour>).detail);
    window.addEventListener(TOUR_EVENT, update);
    return () => window.removeEventListener(TOUR_EVENT, update);
  }, [clinicId]);

  // The board, live.
  useEffect(() => {
    const update = (event: Event) => setCards((event as CustomEvent<BoardCard[]>).detail);
    window.addEventListener(BOARD_EVENT, update);
    return () => window.removeEventListener(BOARD_EVENT, update);
  }, []);

  // Tick off what happened.
  useEffect(() => {
    if (tour.step === 1 && tour.since && lastProgramAt && Date.parse(lastProgramAt) > Date.parse(tour.since)) {
      go({ step: 2, since: new Date().toISOString() });
    } else if (tour.step === 2 && tour.since) {
      const since = tour.since;
      const called = cards.find((c) => c.call && c.call.at > since);
      if (called) go({ step: 3, calledCard: called.id });
    } else if (tour.step === 3 && tour.calledCard) {
      const card = cards.find((c) => c.id === tour.calledCard);
      if (!card?.call) go({ step: 4 });
    }
    // go is stable enough: it only writes what this effect decided
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tour, cards, lastProgramAt]);

  // since: when step 1 or 2 started, so only what happens after it ticks the step off.
  const next = (step: TourStep) => go(step === 1 || step === 2 ? { step, since: new Date().toISOString() } : { step });
  const total = t.steps.length;

  return (
    <section aria-labelledby="demo-tour" lang={lang} className="flex flex-col gap-3 border-[3px] border-action bg-white px-4 py-3 sm:px-5 sm:py-4">
      {tour.step >= 1 && tour.step <= 3 && (
        // «Ξενάγηση · Βήμα 2 από 3» and three bars
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <p className="font-bold text-action">
            {t.tourLabel} <span className="font-normal text-muted">· {t.stepOf(tour.step, total)}</span>
          </p>
          <ol aria-label={t.tourLabel} className="flex flex-1 gap-1.5">
            {t.steps.map((step, i) => (
              <li
                key={step.title}
                className={cx("h-2 min-w-8 flex-1 rounded-full", i + 1 < tour.step ? "bg-action" : i + 1 === tour.step ? "bg-tab-yellow ring-2 ring-action" : "bg-hairline")}
              >
                <span className="sr-only">
                  {step.title}
                  {i + 1 < tour.step ? ` · ${t.stepDone}` : ""}
                </span>
              </li>
            ))}
          </ol>
        </div>
      )}

      {tour.step === 0 && (
        <div className="flex flex-col gap-3">
          <h2 id="demo-tour" className="font-display text-[24px] leading-tight sm:text-[28px]">
            {t.introTitle}
          </h2>
          <p className="text-lg leading-[1.45]">{t.introText}</p>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <button type="button" onClick={() => next(1)} className={cx(bigButton, "cursor-pointer")}>
              {t.introStart} <span aria-hidden="true">→</span>
            </button>
            <span className="text-base text-muted">{t.introSmall}</span>
          </div>
        </div>
      )}

      {tour.step >= 1 && tour.step <= 3 && (
        <div className="flex flex-col gap-2">
          <h2 id="demo-tour" className="font-display text-[24px] leading-tight sm:text-[28px]">
            <span aria-hidden="true" className="mr-2 inline-flex h-9 w-9 items-center justify-center rounded-full bg-action align-middle text-[19px] text-white">
              {tour.step}
            </span>
            {t.steps[tour.step - 1].title}
          </h2>
          <p className="text-lg leading-[1.45]">{t.steps[tour.step - 1].text}</p>
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
            {tour.step === 1 && (
              <Link href={"/notes/new" as Route} className={bigButton}>
                <span aria-hidden="true">🎙</span> {t.steps[0].action}
              </Link>
            )}
            {tour.step === 2 && patientCard && (
              <a href={patientCard.href} target="_blank" rel="noopener" onClick={sameTabOnPhone} className={bigButton}>
                {t.steps[1].action} <span aria-hidden="true">→</span>
              </a>
            )}
            {tour.step === 3 && tour.calledCard && (
              <a href={`#patient-${tour.calledCard}`} className={bigButton}>
                {t.steps[2].action} <span aria-hidden="true">↓</span>
              </a>
            )}
            <button type="button" onClick={() => next((tour.step + 1) as TourStep)} className={quiet}>
              {t.skip}
            </button>
            <button type="button" onClick={() => next(0)} className={quiet}>
              {t.restart}
            </button>
          </div>
        </div>
      )}

      {tour.step === 4 && (
        // All three done: the reason they came.
        <div className="flex flex-col gap-3">
          <h2 id="demo-tour" className="font-display text-[26px] leading-tight sm:text-[30px]">
            ✓ {t.doneTitle}
          </h2>
          <p className="text-lg leading-[1.5]">{t.doneText}</p>
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
            <form action={leaveDemo}>
              <SubmitButton pending={t.leaving}>
                {t.own} <span aria-hidden="true">→</span>
              </SubmitButton>
            </form>
            <button type="button" onClick={() => next(0)} className={quiet}>
              {t.again}
            </button>
          </div>
        </div>
      )}

      {/* The board's cards are from more than 12 hours ago, or all finished: put the patients back. */}
      {cards.length === 0 && (
        <form action={refillDemo} className="flex flex-wrap items-center gap-x-3 border-t border-hairline pt-3">
          <span className="font-semibold">{t.emptyBoard}</span>
          <QuietSubmit pending={t.refilling}>{t.refill}</QuietSubmit>
        </form>
      )}
    </section>
  );
}
