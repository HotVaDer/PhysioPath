// Where a visitor is in the demo's guided tour («Ξενάγηση»), shared by the board (DemoGuide) and every
// other page of the demo (DemoCoach in the staff frame). Kept in this browser only: a convenience, and the
// tour still works (from the start) if storage is blocked.
//   0 intro: what PhysioPath is            → «Ξεκινάμε»
//   1 record: a session by voice            → done when a program is approved after the step started
//                                             (the program page, or a newer program on the board)
//   2 patient: be the patient, «Πονάω»      → done when a new call reaches the board
//   3 board: «Το είδα» on that red card     → done when that call is cleared
//   4 done: «Θέλω τη δική μου κλινική», and «Δείτε και αυτά» (optional, not steps): the home diary, templates,
//     say your templates, the paper sheet. seen: which of them the visitor opened (a ✓ on the board).
export type TourStep = 0 | 1 | 2 | 3 | 4;
export const EXTRAS = ["diary", "templates", "dictate", "print"] as const;
export type TourExtra = (typeof EXTRAS)[number];
// notes: false once the visitor closed the sticky notes (TourNotes), until «Από την αρχή».
export type Tour = { step: TourStep; since?: string; calledCard?: string; seen?: TourExtra[]; notes?: false };

export const TOUR_EVENT = "physiopath:tour";
const key = (clinicId: string) => `physiopath:demo-tour:${clinicId}`;

export function loadTour(clinicId: string): Tour {
  try {
    const value = JSON.parse(localStorage.getItem(key(clinicId)) ?? "null") as Partial<Tour> | null;
    const step = value?.step;
    if (step === 0 || step === 1 || step === 2 || step === 3 || step === 4) {
      const seen = Array.isArray(value?.seen) ? EXTRAS.filter((extra) => value.seen!.includes(extra)) : [];
      return {
        step,
        since: typeof value?.since === "string" ? value.since : undefined,
        calledCard: typeof value?.calledCard === "string" ? value.calledCard : undefined,
        ...(seen.length > 0 && { seen }),
        ...(value?.notes === false && { notes: false as const }),
      };
    }
  } catch {
    // storage blocked or a bad value: start from the intro
  }
  return { step: 0 };
}

// Saves, and tells the other tour component on the page (the same tab doesn't get "storage" events).
export function saveTour(clinicId: string, tour: Tour): void {
  try {
    localStorage.setItem(key(clinicId), JSON.stringify(tour));
  } catch {
    // storage blocked
  }
  window.dispatchEvent(new CustomEvent<Tour>(TOUR_EVENT, { detail: tour }));
}

// One of «Δείτε και αυτά» was opened: kept with the tour (also through «Από την αρχή»).
export function markSeen(clinicId: string, extra: TourExtra): Tour {
  const tour = loadTour(clinicId);
  if (tour.seen?.includes(extra)) return tour;
  const next = { ...tour, seen: EXTRAS.filter((e) => e === extra || tour.seen?.includes(e)) };
  saveTour(clinicId, next);
  return next;
}

// The patient's screen (/s/…) has no clinic of its own to look up: the staff pages of a demo leave a pointer
// to their tour here, so the sticky notes can carry on there (same browser). Only for 2 hours: a later real
// patient screen on this browser is left alone.
const LAST = "physiopath:demo-tour:last";
const LAST_MS = 2 * 60 * 60 * 1000;

export function rememberTour(clinicId: string, lang: "el" | "en"): void {
  try {
    localStorage.setItem(LAST, JSON.stringify({ clinicId, lang, at: Date.now() }));
  } catch {
    // storage blocked
  }
}

export function lastTour(now = Date.now()): { clinicId: string; lang: "el" | "en" } | null {
  try {
    const value = JSON.parse(localStorage.getItem(LAST) ?? "null") as { clinicId?: unknown; lang?: unknown; at?: unknown } | null;
    if (typeof value?.clinicId !== "string" || typeof value.at !== "number" || now - value.at > LAST_MS) return null;
    return { clinicId: value.clinicId, lang: value.lang === "en" ? "en" : "el" };
  } catch {
    return null;
  }
}
