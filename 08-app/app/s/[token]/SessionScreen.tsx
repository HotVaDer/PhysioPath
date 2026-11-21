"use client";
// The patient's screen during the session, on their own phone (from the QR code). No login.
// Same paper as the home program /p/<token> (PatientSheet): the clinic's letterhead and «Για: <name>» on
// a sheet with a green top edge. «One thing at a time»: the exercise and the set number big, no boxes,
// and one green button under the thumb with «Αναίρεση» a small link under it.
// - The bar (SessionBar) stays at the top: «Αα» and «Φυσιοθεραπευτής» (calling: απορία / πονάω).
// - «Άσκηση 2 από 5» above the name. Under the exercise, the path (SessionPath): the exercises as circles
//   on a line, «Όλες» opens them as a list (tapping one tells the board: 'show'), and «Μετά: …».
// - A call shows at the top of the sheet in its colour, with «Ακύρωση κλήσης». No connection shows
//   right above the button, where the patient just pressed.
// Built for old phones and older eyes: a plain request every 3 s (no websockets), sizes in rem so the
// text-size choice makes everything bigger, and the screen kept on where the browser allows it.
import { useCallback, useEffect, useRef, useState } from "react";

import { HouseIcon } from "@/app/components/patient/icons";
import { PatientSheet } from "@/app/components/patient/PatientSheet";
import { allDone, exercisesDone, isDone, readPatientView, undoExercise, type CallReason, type PatientAction, type PatientView } from "@/app/lib/board/session";
import { cx } from "@/app/lib/cx";
import { doseLines, holdSeconds, isBlank } from "@/app/lib/notes/format";
import type { Exercise } from "@/app/lib/notes/schema";
import { HoldTimer } from "@/app/s/[token]/HoldTimer";
import { SessionBar, type BarPanel } from "@/app/s/[token]/SessionBar";
import { SessionPath } from "@/app/s/[token]/SessionPath";

const POLL_MS = 3000; // picks up the staff side: a call they saw, «Τέλος»

// Today's dose without the sets (the big counter shows those), without "how often" (that's for home)
// and without a hold the countdown already shows.
const todayDose = (exercise: Exercise) =>
  doseLines({ ...exercise, sets: null, frequency: null, hold: holdSeconds(exercise.hold) ? null : exercise.hold });

// A new exercise on screen starts from the top of the page (its name), wherever the patient had scrolled.
const toTop = () => document.documentElement.scrollIntoView?.({ block: "start" });

async function request(token: string, action?: PatientAction): Promise<PatientView> {
  const response = await fetch(`/api/s/${token}`, {
    method: action ? "POST" : "GET",
    cache: "no-store",
    ...(action && { headers: { "content-type": "application/json" }, body: JSON.stringify(action) }),
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const view = readPatientView(await response.json());
  if (!view) throw new Error("unexpected answer");
  return view;
}

// Under the thumb, so it stays on screen: on a phone its size is capped by the screen width (never
// under 48 px), or at the biggest text size the button and «Αναίρεση» would take a third of the screen.
const bigButton =
  "flex min-h-[max(48px,min(3.75rem,17vw))] w-full cursor-pointer items-center justify-center gap-3 bg-action px-4 py-[min(0.5rem,2vw)] text-center text-[min(1.15rem,6.6vw)] font-bold text-white hover:bg-action-hover";
const thumbLink =
  "min-h-[48px] cursor-pointer px-2 text-[min(1rem,5.4vw)] text-action underline underline-offset-[3px] hover:text-ink disabled:cursor-default disabled:text-muted disabled:no-underline";
// A link on a pink or yellow box is ink, not green (green on pink is only 5.8:1).
const boxLink = "min-h-[48px] cursor-pointer text-ink underline underline-offset-[3px] hover:decoration-2 disabled:cursor-default";
type Panel = BarPanel | "list";

export function SessionScreen({ token, initial }: { token: string; initial: PatientView }) {
  const [view, setView] = useState(initial);
  const [pending, setPending] = useState(false);
  const [offline, setOffline] = useState(false);
  const [panel, setPanel] = useState<Panel>("none");
  const [justFinished, setJustFinished] = useState<string | null>(null);
  const [looking, setLooking] = useState(false); // the patient opened an exercise from the list
  const pendingRef = useRef(false);
  const tapsRef = useRef(0); // counts taps, so a refresh that started before a tap can't undo it

  const total = view.program.exercises.length;
  const shown = allDone(view) && !looking ? -1 : view.current; // -1: «Τελειώσατε»
  const exercise = shown >= 0 ? view.program.exercises[shown] : null;
  const sets = shown >= 0 ? view.setsTarget[shown] : 0;
  const setsDone = shown >= 0 ? view.setsDone[shown] : 0;
  const allSetsDone = setsDone >= sets;
  const setNumber = Math.min(setsDone + 1, sets);
  const nextIndex = view.setsTarget.findIndex((_, i) => i !== shown && !isDone(view, i)); // where it goes after this one
  const next = nextIndex >= 0 ? view.program.exercises[nextIndex] : null;
  const undoTarget = undoExercise(view, shown);
  const finished = Boolean(view.finishedAt);
  const hold = exercise ? holdSeconds(exercise.hold) : null;

  const refresh = useCallback(async () => {
    const taps = tapsRef.current;
    try {
      const fresh = await request(token);
      if (taps === tapsRef.current && !pendingRef.current) setView(fresh);
      setOffline(false);
    } catch {
      setOffline(true);
    }
  }, [token]);

  // Ask again every 3 s (one request at a time), not while hidden or while a tap is on its way; stop after «Τέλος».
  useEffect(() => {
    if (finished) return;
    let stopped = false;
    let timer: ReturnType<typeof setTimeout>;
    const tick = async () => {
      if (!pendingRef.current && !document.hidden) await refresh();
      if (!stopped) timer = setTimeout(tick, POLL_MS);
    };
    timer = setTimeout(tick, POLL_MS);
    return () => {
      stopped = true;
      clearTimeout(timer);
    };
  }, [finished, refresh]);

  // Keep the screen on during the session where the browser allows it.
  useEffect(() => {
    let lock: { release: () => Promise<void> } | undefined;
    const wakeLock = (navigator as Navigator & { wakeLock?: { request: (type: "screen") => Promise<{ release: () => Promise<void> }> } }).wakeLock;
    wakeLock
      ?.request("screen")
      .then((l) => (lock = l))
      .catch(() => {});
    return () => void lock?.release().catch(() => {});
  }, []);

  async function send(action: PatientAction) {
    tapsRef.current += 1;
    pendingRef.current = true;
    setPending(true);
    try {
      setView(await request(token, action));
      setOffline(false);
      return true;
    } catch {
      setOffline(true);
      return false;
    } finally {
      pendingRef.current = false;
      setPending(false);
    }
  }

  async function finishSet() {
    if (!exercise || allSetsDone) return;
    setJustFinished(null); // «… έγινε» is for the first look at the next exercise, not for all its sets
    const name = exercise.name;
    const lastSet = setsDone + 1 >= sets;
    if ((await send({ type: "setDone", exercise: shown, set: setsDone + 1 })) && lastSet) {
      setJustFinished(name); // the database has already moved on to the next exercise
      setLooking(false);
      toTop();
    }
  }

  async function undo() {
    if (undoTarget < 0) return;
    setJustFinished(null);
    await send({ type: "undoSet", exercise: undoTarget, set: view.setsDone[undoTarget] });
  }

  function goTo(i: number) {
    setJustFinished(null);
    setLooking(true);
    setPanel("none");
    setView((v) => ({ ...v, current: i })); // at once on screen; the database hears it next
    toTop();
    void send({ type: "show", exercise: i });
  }

  async function call(reason: CallReason) {
    if (await send({ type: "call", reason })) setPanel("none");
  }

  const toggle = (p: Panel) => {
    // The bar's choices (sizes, the call) open in the bar itself, at the top of the page.
    if ((p === "size" || p === "call") && panel !== p) toTop();
    setPanel((open) => (open === p ? "none" : p));
  };
  // While the bar's choices are open the bar scrolls with the page: stuck to the top, a tall panel (big
  // text on a small phone) would hide its last buttons with no way to scroll to them.
  const stickyBar = panel !== "size" && (panel !== "call" || finished);

  const bar = (
    <SessionBar
      panel={panel === "list" ? "none" : panel}
      onToggle={toggle}
      call={view.call}
      onCall={finished ? null : (reason) => void call(reason)}
      pending={pending}
    />
  );
  const letterhead = <Letterhead clinic={view.clinicName} name={view.program.patient_first_name} />;

  // ---------- after «Τέλος» from the staff ----------
  if (finished) {
    return (
      <PatientSheet stickyBar={stickyBar} bar={bar} letterhead={letterhead}>
        <section aria-labelledby="finished" className="flex flex-col items-start gap-4 pt-2">
          <DoneMark />
          <h1 id="finished" className="font-display text-[min(2rem,10vw)] leading-[1.15] text-balance">
            Η συνεδρία ολοκληρώθηκε
          </h1>
          <p className="text-[1.15rem]">Ευχαριστούμε! Το πρόγραμμα για το σπίτι είναι έτοιμο.</p>
          {view.homeToken && (
            <a
              href={`/p/${view.homeToken}`}
              className="mt-3 flex min-h-[3.75rem] w-full items-center gap-3 bg-action px-4 py-2.5 text-left text-[1.15rem] leading-snug font-bold text-white no-underline hover:bg-action-hover hover:text-white"
            >
              <HouseIcon className="size-[1.75rem]" />
              Το πρόγραμμα για το σπίτι
            </a>
          )}
        </section>
      </PatientSheet>
    );
  }

  const path = <SessionPath view={view} shown={shown} open={panel === "list"} onToggle={() => toggle("list")} onGoTo={goTo} />;

  // ---------- under the thumb: the one thing to press, and a small «Αναίρεση» ----------
  const thumb = (
    <div className="flex flex-col items-center gap-0.5 pt-[min(0.75rem,3vw)]">
      {offline && (
        <div role="alert" className="mb-2 flex w-full flex-wrap items-center justify-between gap-x-4 bg-tab-pink px-3 py-1 text-[min(1rem,5.4vw)]">
          <p className="font-bold">Δεν υπάρχει σύνδεση. Δοκιμάζουμε ξανά μόνο του.</p>
          <button type="button" onClick={() => void refresh()} className={boxLink}>
            Δοκιμάστε ξανά
          </button>
        </div>
      )}
      {exercise && !allSetsDone && (
        <button type="button" disabled={pending} aria-busy={pending} onClick={() => void finishSet()} className={cx(bigButton, "disabled:cursor-wait disabled:opacity-80")}>
          {/* An empty box, like «Το έκανα σήμερα» on the home program: pressing it ticks the set. */}
          <span aria-hidden="true" className="size-[min(1.35rem,6vw)] flex-none border-2 border-white" />
          {sets > 1 ? `Τελείωσα το σετ ${setNumber}` : "Τελείωσα την άσκηση"}
        </button>
      )}
      {exercise && allSetsDone && next && (
        <button type="button" onClick={() => goTo(nextIndex)} className={bigButton}>
          Στην επόμενη άσκηση
          <span aria-hidden="true">→</span>
        </button>
      )}
      <button type="button" disabled={pending || undoTarget < 0} onClick={() => void undo()} className={thumbLink}>
        {undoTarget >= 0 && view.setsTarget[undoTarget] > 1 ? "Αναίρεση τελευταίου σετ" : "Αναίρεση"}
      </button>
    </div>
  );

  return (
    <PatientSheet stickyBar={stickyBar} bar={bar} letterhead={letterhead} bottomBar={thumb}>
      <div className="flex flex-col gap-6">
        {view.call && (
          <div role="status" className={cx("flex flex-wrap items-center justify-between gap-x-4 gap-y-1 px-4 py-3", view.call.reason === "pain" ? "bg-tab-pink" : "bg-tab-yellow")}>
            <p className="font-bold">{`Ο φυσιοθεραπευτής ειδοποιήθηκε. ${view.call.reason === "pain" ? "Είπατε ότι πονάτε." : "Είπατε ότι έχετε απορία."}`}</p>
            <button type="button" disabled={pending} onClick={() => void send({ type: "cancelCall" })} className={boxLink}>
              Ακύρωση κλήσης
            </button>
          </div>
        )}

        {justFinished && exercise && (
          <p role="status" className="-mb-2 flex items-center gap-3 bg-note-green px-4 py-3 font-bold">
            <span aria-hidden="true" className="grid size-[2rem] flex-none place-items-center rounded-full bg-action text-white">
              ✓
            </span>
            <span>{`«${justFinished}» έγινε. Τώρα:`}</span>
          </p>
        )}

        {exercise ? (
          <section aria-labelledby="exercise-name" className="flex flex-col gap-6">
            <div className="flex flex-col gap-2">
              <p aria-live="polite" className="text-muted">{`Άσκηση ${shown + 1} από ${total}`}</p>
              <h1 id="exercise-name" className="font-display text-[min(1.85rem,9.2vw)] leading-[1.15] text-pretty sm:text-[2.25rem]">
                {exercise.name}
              </h1>
              {todayDose(exercise).map((line, i) => (
                <p key={line} className={cx("text-[1.15rem]", i === 0 && "font-bold")}>
                  {line}
                </p>
              ))}
              {!isBlank(exercise.notes) && <p className="text-[1.05rem]">{exercise.notes}</p>}
            </div>

            <SetCounter sets={sets} setsDone={setsDone} />

            {hold && !allSetsDone && <HoldTimer key={`${shown}-${setNumber}`} seconds={hold} />}

            {/* Where this is on the day's path, and what comes after it. */}
            <div className="flex flex-col gap-3 border-t-2 border-hairline pt-4">
              {path}
              {next ? (
                <p>
                  <span className="text-muted">Μετά:</span> {next.name}
                </p>
              ) : (
                !allSetsDone && <p className="text-muted">Αυτή είναι η τελευταία άσκηση.</p>
              )}
            </div>
          </section>
        ) : (
          <section aria-labelledby="all-done" className="flex flex-col items-start gap-4">
            <p aria-live="polite" className="text-muted">{`${exercisesDone(view)} από ${total} ασκήσεις έγιναν`}</p>
            <DoneMark />
            <h1 id="all-done" className="font-display text-[min(2rem,10vw)] leading-[1.15] text-balance">
              Τελειώσατε τις ασκήσεις
            </h1>
            <p className="text-[1.15rem]">Μπράβο! Ο φυσιοθεραπευτής το βλέπει στην οθόνη του.</p>
            <div className="mt-2 w-full border-t-2 border-hairline pt-4">{path}</div>
          </section>
        )}
      </div>
    </PatientSheet>
  );
}

// Who the session is with: the clinic's name, and «Για: <name>» as on the home program.
function Letterhead({ clinic, name }: { clinic: string; name: string | null | undefined }) {
  const patient = isBlank(name) ? null : name!.trim();
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-0.5">
      <p className="font-display text-[min(1.2rem,6.5vw)] leading-tight">{clinic.trim()}</p>
      {patient && (
        <p>
          <span className="text-muted">Για:</span> <span className="font-typed text-[1.05rem] font-bold">{patient}</span>
        </p>
      )}
    </div>
  );
}

// The set counter, the biggest thing on the screen: «Σετ 2 από 3», and under it a box per set like the
// ones on the printed home program (✓ when done, a thick border on the one now).
function SetCounter({ sets, setsDone }: { sets: number; setsDone: number }) {
  const allSetsDone = setsDone >= sets;
  const setNumber = Math.min(setsDone + 1, sets);
  return (
    <div className="flex flex-col gap-3">
      {allSetsDone ? (
        <p className="font-display text-[2.4rem] leading-tight text-action">
          <span className="text-[1.5rem] text-muted">Σετ </span>✓ Έγινε
        </p>
      ) : (
        <p className="font-display leading-none">
          <span className="text-[1.5rem] text-muted">Σετ </span>
          <span className="text-[min(5rem,24vw)]">{setNumber}</span>
          <span className="text-[1.5rem] text-muted"> από {sets}</span>
        </p>
      )}
      {sets > 1 && (
        <ol aria-label="Τα σετ" className="flex flex-wrap gap-2">
          {Array.from({ length: sets }, (_, i) => (
            <li
              key={i}
              className={cx(
                "grid size-[2rem] place-items-center font-display text-[1rem] leading-none",
                i < setsDone ? "bg-action text-white" : i === setsDone ? "border-[3px] border-ink bg-white text-ink" : "border-2 border-line text-muted",
              )}
            >
              <span aria-hidden="true">{i < setsDone ? "✓" : i + 1}</span>
              <span className="sr-only">{`Σετ ${i + 1}${i < setsDone ? ", έγινε" : ""}`}</span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

// A big green ✓, for «Τελειώσατε» and «Η συνεδρία ολοκληρώθηκε».
function DoneMark() {
  return (
    <span aria-hidden="true" className="grid size-[3.5rem] place-items-center rounded-full bg-action font-display text-[1.9rem] leading-none text-white">
      ✓
    </span>
  );
}
