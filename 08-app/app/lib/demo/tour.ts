// Where a visitor is in the demo's guided tour («Ξενάγηση»), shared by the board (DemoGuide) and every
// other page of the demo (DemoCoach in the staff frame). Kept in this browser only: a convenience, and the
// tour still works (from the start) if storage is blocked.
//   0 intro: what PhysioPath is            → «Ξεκινάμε»
//   1 record: a session by voice            → done when a program is approved (the program page)
//   2 patient: be the patient, «Πονάω»      → done when a new call reaches the board
//   3 board: «Το είδα» on that red card     → done when that call is cleared
//   4 done: «Θέλω τη δική μου κλινική»
export type TourStep = 0 | 1 | 2 | 3 | 4;
export type Tour = { step: TourStep; since?: string; calledCard?: string };

export const TOUR_EVENT = "physiopath:tour";
const key = (clinicId: string) => `physiopath:demo-tour:${clinicId}`;

export function loadTour(clinicId: string): Tour {
  try {
    const value = JSON.parse(localStorage.getItem(key(clinicId)) ?? "null") as Partial<Tour> | null;
    const step = value?.step;
    if (step === 0 || step === 1 || step === 2 || step === 3 || step === 4) {
      return { step, since: typeof value?.since === "string" ? value.since : undefined, calledCard: typeof value?.calledCard === "string" ? value.calledCard : undefined };
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
