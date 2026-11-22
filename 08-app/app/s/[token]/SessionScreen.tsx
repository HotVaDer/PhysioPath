"use client";
// The patient's screen during the session, on their own phone (from the QR code). No login.
// Layout from the canvas boards «Patient · session» and «Patient · hold countdown» (page «Αίθουσα»),
// drawn in the app's paper look (user's choice 2026-11-22), top to bottom:
//   the clinic and «Για: <name>» · «Άσκηση 2 από 3» and one box per exercise (tap one to go there; the
//   board hears it: 'show') · the exercise centred: name, dose, notes, «Σετ 2 από 3» with a circle per
//   set, the big hold ring · «Τελείωσα το σετ 2» · «Αναίρεση» · «Μετά: …» · «Χρειάζομαι τον
//   φυσιοθεραπευτή» (the choices and the "called" message open right there).
// The board's video box («Δείτε πώς γίνεται») is left out until exercises have videos.
// Built for old phones and older eyes: a plain request every 3 s (no websockets), sizes in rem so the
// text-size choice makes everything bigger.
import { useCallback, useEffect, useRef, useState } from "react";

import { LogoMark } from "@/app/components/paper/Logo";
import { PatientSheet } from "@/app/components/patient/PatientSheet";
import { TextSizeControl, useTextSize } from "@/app/components/patient/TextSize";
import { allDone, exercisesDone, isDone, readPatientView, undoExercise, type PatientAction, type PatientView } from "@/app/lib/board/session";
import { cx } from "@/app/lib/cx";
import { doseLines, holdSeconds, isBlank } from "@/app/lib/notes/format";
import type { Exercise } from "@/app/lib/notes/schema";
import { HoldTimer } from "@/app/s/[token]/HoldTimer";

const POLL_MS = 3000; // picks up the staff side: a call they saw, «Τέλος»

// Today's dose in full words («3 σετ × 10 επαναλήψεις»), without "how often" (that's for home) and
// without a hold the ring already shows. One set is just «10 επαναλήψεις», not «1 σετ × …».
const todayDose = (exercise: Exercise) =>
  doseLines({ ...exercise, sets: (exercise.sets ?? 0) > 1 ? exercise.sets : null, frequency: null, hold: holdSeconds(exercise.hold) ? null : exercise.hold });

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

// The paper look's buttons: square, full width, at least 48 px (here 4 rem, growing with «Αα»).
const big = "flex min-h-[3.5rem] w-full cursor-pointer items-center justify-center gap-2.5 px-4 py-2 text-center text-[1.1rem] leading-snug font-bold";
const primary = cx(big, "bg-action text-white hover:bg-action-hover disabled:cursor-wait disabled:opacity-80");
const outlined = cx(big, "min-h-[3rem] border-[3px] border-action bg-white px-3 text-[1rem] text-action hover:text-action-hover");
const switchedOff = cx(big, "cursor-default border-2 border-dashed border-line bg-transparent text-muted");
const quietLink = "min-h-12 cursor-pointer text-ink underline underline-offset-[3px] hover:decoration-2 disabled:cursor-default";

type Panel = "none" | "size" | "call";

export function SessionScreen({ token, initial }: { token: string; initial: PatientView }) {
  const [view, setView] = useState(initial);
  const [pending, setPending] = useState(false);
  const [offline, setOffline] = useState(false);
  const [panel, setPanel] = useState<Panel>("none");
  const [justFinished, setJustFinished] = useState<string | null>(null);
  const [looking, setLooking] = useState(false); // the patient opened an exercise from the boxes
  const [textSize, changeTextSize] = useTextSize();
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
    setJustFinished(null);
    const name = exercise.name;
    const lastSet = setsDone + 1 >= sets;
    if ((await send({ type: "setDone", exercise: shown, set: setsDone + 1 })) && lastSet) {
      setJustFinished(name); // the database has already moved on to the next exercise
      setLooking(false);
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
    setView((v) => ({ ...v, current: i })); // at once on screen; the database hears it next
    void send({ type: "show", exercise: i });
  }

  async function call(reason: "question" | "pain") {
    if (await send({ type: "call", reason })) setPanel("none");
  }

  const toggle = (p: Panel) => setPanel((open) => (open === p ? "none" : p));

  // The bar above the sheet: the «Φ» and «Αα» (the three text sizes, shared with the home program).
  const bar = (
    <>
      <LogoMark className="size-[2rem]" />
      <button
        type="button"
        aria-expanded={panel === "size"}
        aria-label="Αα, μέγεθος γραμμάτων"
        onClick={() => toggle("size")}
        className={cx("ml-auto flex min-h-12 cursor-pointer items-center border-2 px-3 text-[0.95rem] font-bold text-ink", panel === "size" ? "border-ink bg-white" : "border-line bg-sheet")}
      >
        Αα
      </button>
      {panel === "size" && (
        <div className="basis-full pt-1 pb-2">
          <TextSizeControl value={textSize} onChange={changeTextSize} />
        </div>
      )}
    </>
  );

  // Who the session is with: the clinic, and «Για: <name>» as on the home program.
  const patient = isBlank(view.program.patient_first_name) ? null : view.program.patient_first_name!.trim();
  const letterhead = (
    <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-0.5">
      <p className="font-display text-[1.2rem] leading-tight">{view.clinicName.trim()}</p>
      {patient && (
        <p>
          <span className="text-muted">Για:</span> <span className="font-typed text-[1.05rem] font-bold">{patient}</span>
        </p>
      )}
    </div>
  );

  // ---------- after «Τέλος» from the staff ----------
  if (finished) {
    return (
      <PatientSheet bar={bar} letterhead={letterhead}>
        <section aria-labelledby="finished" className="flex flex-col items-center gap-4 pt-2 text-center">
          <DoneMark />
          <h1 id="finished" className="font-display text-[min(2rem,10vw)] leading-[1.15] text-balance">
            Η συνεδρία ολοκληρώθηκε
          </h1>
          <p className="text-[1.15rem]">Ευχαριστούμε! Το πρόγραμμα για το σπίτι είναι έτοιμο.</p>
          {view.homeToken && (
            <a href={`/p/${view.homeToken}`} className={cx(primary, "mt-3 no-underline hover:text-white")}>
              Το πρόγραμμα για το σπίτι <span aria-hidden="true">→</span>
            </a>
          )}
        </section>
      </PatientSheet>
    );
  }

  // ---------- the exercises as boxes: where we are, and tap one to go there ----------
  const boxes = (
    <nav aria-label="Οι ασκήσεις της συνεδρίας" className="flex flex-col gap-2">
      <p aria-live="polite" className="font-bold text-muted">
        {exercise ? `Άσκηση ${shown + 1} από ${total}` : `${exercisesDone(view)} από ${total} ασκήσεις έγιναν`}
      </p>
      <ol className="flex flex-wrap gap-2">
        {view.program.exercises.map((e, i) => {
          const complete = isDone(view, i);
          const current = i === shown;
          return (
            <li key={i} className="min-w-[3.25rem] flex-1">
              <button
                type="button"
                onClick={() => goTo(i)}
                aria-current={current ? "step" : undefined}
                aria-label={`Άσκηση ${i + 1}: ${e.name}${complete ? ", έγινε" : ""}${current ? ", τώρα" : ""}`}
                className={cx(
                  "flex min-h-[3rem] w-full cursor-pointer items-center justify-center gap-1.5 font-display text-[1.2rem] leading-none",
                  current
                    ? "border-[3px] border-ink bg-white text-ink"
                    : complete
                      ? "border-2 border-action bg-action text-white"
                      : "border-2 border-line bg-sheet text-muted hover:border-ink",
                )}
              >
                {complete && <span aria-hidden="true">✓</span>}
                <span aria-hidden="true">{i + 1}</span>
              </button>
            </li>
          );
        })}
      </ol>
      {total > 1 && <p className="text-[0.9rem] text-muted">Πατήστε ένα κουτί για να πάτε σε άλλη άσκηση.</p>}
    </nav>
  );

  // ---------- at the bottom: calling the physio (the choices and the message open right here) ----------
  const callArea = view.call ? (
    <section role="status" className={cx("flex flex-col gap-2 px-4 py-4", view.call.reason === "pain" ? "border-[3px] border-error bg-tab-pink" : "border-2 border-ink bg-tab-yellow")}>
      <p className="font-display text-[1.3rem] leading-tight">Ο φυσιοθεραπευτής ειδοποιήθηκε</p>
      <p className="font-bold">{view.call.reason === "pain" ? "Είπατε ότι πονάτε." : "Είπατε ότι έχετε απορία."}</p>
      <button type="button" disabled={pending} onClick={() => void send({ type: "cancelCall" })} className={cx(quietLink, "self-start")}>
        Ακύρωση κλήσης
      </button>
    </section>
  ) : panel === "call" ? (
    <fieldset className="flex flex-col gap-3">
      <legend className="pb-3 font-display text-[1.3rem] leading-tight">Τι συμβαίνει;</legend>
      <button
        type="button"
        disabled={pending}
        onClick={() => void call("question")}
        className="flex min-h-[4.25rem] cursor-pointer items-center gap-3 border-2 border-ink bg-tab-yellow px-4 text-left text-[1.15rem] font-bold text-ink"
      >
        <span aria-hidden="true" className="grid size-[1.9rem] flex-none place-items-center rounded-full bg-ink font-typed text-tab-yellow">
          ?
        </span>
        Έχω απορία
      </button>
      <button
        type="button"
        disabled={pending}
        onClick={() => void call("pain")}
        className="flex min-h-[4.25rem] cursor-pointer items-center gap-3 border-[3px] border-error bg-tab-pink px-4 text-left text-[1.15rem] font-bold text-ink"
      >
        <span aria-hidden="true" className="grid size-[1.9rem] flex-none place-items-center rounded-full bg-error font-typed text-white">
          !
        </span>
        Πονάω
      </button>
      <button type="button" onClick={() => setPanel("none")} className={cx(quietLink, "self-start text-action")}>
        Πίσω
      </button>
    </fieldset>
  ) : (
    <button type="button" onClick={() => toggle("call")} className={cx(big, "min-h-[3rem] border-2 border-ink bg-sheet px-3 text-[1rem] text-ink hover:bg-white")}>
      <BubbleIcon />
      Χρειάζομαι τον φυσιοθεραπευτή
    </button>
  );

  const undoButton = (
    <button type="button" disabled={pending || undoTarget < 0} onClick={() => void undo()} className={undoTarget < 0 ? switchedOff : outlined}>
      <UndoIcon />
      {undoTarget >= 0 && view.setsTarget[undoTarget] > 1 ? "Αναίρεση τελευταίου σετ" : "Αναίρεση"}
    </button>
  );

  const offlineNote = offline && (
    <div role="alert" className="flex flex-wrap items-center justify-between gap-x-4 bg-tab-pink px-4 py-2">
      <p className="font-bold">Δεν υπάρχει σύνδεση. Δοκιμάζουμε ξανά μόνο του.</p>
      <button type="button" onClick={() => void refresh()} className={quietLink}>
        Δοκιμάστε ξανά
      </button>
    </div>
  );

  // ---------- everything done ----------
  if (!exercise) {
    return (
      <PatientSheet bar={bar} letterhead={letterhead}>
        <div className="flex flex-col gap-6">
          {boxes}
          <section aria-labelledby="all-done" className="flex flex-col items-center gap-3 border-t-2 border-hairline pt-6 text-center">
            <DoneMark />
            <h1 id="all-done" className="font-display text-[min(2rem,10vw)] leading-[1.15] text-balance">
              Τελειώσατε τις ασκήσεις
            </h1>
            <p className="text-[1.15rem]">Μπράβο! Ο φυσιοθεραπευτής το βλέπει στην οθόνη του.</p>
          </section>
          {offlineNote}
          {undoButton}
          <div className="pt-2">{callArea}</div>
        </div>
      </PatientSheet>
    );
  }

  // ---------- one exercise ----------
  return (
    <PatientSheet bar={bar} letterhead={letterhead}>
      <div className="flex flex-col gap-4">
        {boxes}

        {justFinished && (
          <p role="status" className="flex items-center gap-3 bg-note-green px-4 py-3 font-bold">
            <span aria-hidden="true" className="grid size-[2rem] flex-none place-items-center rounded-full bg-action text-white">
              ✓
            </span>
            <span>{`«${justFinished}» έγινε. Τώρα:`}</span>
          </p>
        )}

        {/* The exercise, centred: name, dose, notes, the sets, the hold. */}
        <section aria-labelledby="exercise-name" className="flex flex-col items-center gap-2 border-t-2 border-hairline pt-4 text-center">
          <h1 id="exercise-name" className="font-display text-[min(1.75rem,8.5vw)] leading-[1.1] text-balance">
            {exercise.name}
          </h1>
          {todayDose(exercise).map((line, i) => (
            <p key={i} className={cx("text-[1.3rem]", i === 0 && "font-bold")}>
              {line}
            </p>
          ))}
          {!isBlank(exercise.notes) && <p className="text-[1.05rem] text-muted">{exercise.notes}</p>}

          {sets > 1 && (
            <div className="flex flex-col items-center gap-2 pt-1">
              <p className="text-[1.1rem] font-bold text-muted">{allSetsDone ? "Όλα τα σετ έγιναν" : `Σετ ${setNumber} από ${sets}`}</p>
              <ol aria-label="Τα σετ" className="flex flex-wrap justify-center gap-3">
                {Array.from({ length: sets }, (_, i) => (
                  <li
                    key={i}
                    className={cx(
                      "grid size-[3rem] place-items-center rounded-full font-display text-[1.3rem] leading-none",
                      i < setsDone ? "bg-action text-white" : i === setsDone ? "border-[3px] border-action text-ink" : "border-[3px] border-line text-muted",
                    )}
                  >
                    <span aria-hidden="true">{i < setsDone ? "✓" : i + 1}</span>
                    <span className="sr-only">{`Σετ ${i + 1}${i < setsDone ? ", έγινε" : ""}`}</span>
                  </li>
                ))}
              </ol>
            </div>
          )}

          {hold && !allSetsDone && (
            <div className="w-full pt-2">
              <HoldTimer key={`${shown}-${setNumber}`} seconds={hold} />
            </div>
          )}
        </section>

        {offlineNote}

        <div className="flex flex-col gap-2.5">
          {allSetsDone ? (
            <button type="button" disabled className={switchedOff}>
              Η άσκηση ολοκληρώθηκε
            </button>
          ) : (
            <button type="button" disabled={pending} aria-busy={pending} onClick={() => void finishSet()} className={primary}>
              <span aria-hidden="true">✓</span>
              {sets > 1 ? `Τελείωσα το σετ ${setNumber}` : "Τελείωσα την άσκηση"}
            </button>
          )}
          {undoButton}
        </div>

        {/* What comes after this one. */}
        <div className="flex flex-col gap-0.5 bg-note-green px-4 py-3">
          <p className="font-bold text-muted">{next ? "Μετά" : "Αυτή είναι η τελευταία άσκηση"}</p>
          <p className="font-display text-[1.2rem] leading-snug">{next ? next.name : "Μετά τελειώνει η συνεδρία"}</p>
          <p className="text-muted">{next ? todayDose(next).join(" · ") : "Ο φυσιοθεραπευτής το βλέπει στην οθόνη του."}</p>
        </div>

        <div className="pt-2">{callArea}</div>
      </div>
    </PatientSheet>
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

// A curved arrow back, as on the board's «Αναίρεση». Decoration: the words say it.
function UndoIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="size-[1.4rem] flex-none" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 14L4 9l5-5" />
      <path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11" />
    </svg>
  );
}

// A speech bubble, as on the board's call button. Decoration: the words say it.
function BubbleIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="size-[1.4rem] flex-none" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20.5 11.5a8.5 8.5 0 0 1-12.3 7.6L3.5 20.5l1.4-4.4A8.5 8.5 0 1 1 20.5 11.5z" />
    </svg>
  );
}
