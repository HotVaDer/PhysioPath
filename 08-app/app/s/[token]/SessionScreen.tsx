"use client";
// The patient's screen during the session, on their own phone (from the QR code). No login.
// «One thing at a time» (user's choice 2026-11-18): no boxes, the exercise and the set number big,
// one green button fixed at the bottom under the thumb, «Αναίρεση» a small link under it.
// The top bar keeps «Αα» (text size) and «Φυσιοθεραπευτής» (the call) always in reach; «Όλες» opens
// the list of exercises (tapping one tells the board: 'show'). Calling only passes the message on.
// Built for old phones and older eyes: a plain request every 3 s (no websockets), sizes in rem so the
// text-size choice makes everything bigger.
import { useCallback, useEffect, useRef, useState } from "react";

import { LogoMark } from "@/app/components/paper/Logo";
import { TextSizeControl, useTextSize } from "@/app/components/patient/TextSize";
import { allDone, exercisesDone, isDone, readPatientView, undoExercise, type PatientAction, type PatientView } from "@/app/lib/board/session";
import { cx } from "@/app/lib/cx";
import { doseLines, holdSeconds, isBlank } from "@/app/lib/notes/format";
import type { Exercise } from "@/app/lib/notes/schema";
import { HoldTimer } from "@/app/s/[token]/HoldTimer";

const POLL_MS = 3000; // picks up the staff side: a call they saw, «Τέλος»

// Today's dose without the sets (the big counter shows those), without "how often" (that's for home)
// and without a hold the countdown already shows.
const todayDose = (exercise: Exercise) =>
  doseLines({ ...exercise, sets: null, frequency: null, hold: holdSeconds(exercise.hold) ? null : exercise.hold });

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

const link = "min-h-11 cursor-pointer text-action underline underline-offset-[3px] hover:text-ink disabled:cursor-default disabled:text-muted disabled:no-underline";
const barButton = "min-h-11 cursor-pointer border-2 px-2.5 text-[0.9rem] font-bold";
type Panel = "none" | "size" | "call" | "list";

export function SessionScreen({ token, initial }: { token: string; initial: PatientView }) {
  const [view, setView] = useState(initial);
  const [pending, setPending] = useState(false);
  const [offline, setOffline] = useState(false);
  const [panel, setPanel] = useState<Panel>("none");
  const [justFinished, setJustFinished] = useState<string | null>(null);
  const [looking, setLooking] = useState(false); // the patient opened an exercise from the list
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
    setPanel("none");
    setView((v) => ({ ...v, current: i })); // at once on screen; the database hears it next
    void send({ type: "show", exercise: i });
  }

  async function call(reason: "question" | "pain") {
    if (await send({ type: "call", reason })) setPanel("none");
  }

  const toggle = (p: Panel) => setPanel((open) => (open === p ? "none" : p));

  // ---------- top bar: always the same ----------
  const topBar = (
    <header className="sticky top-0 z-10 border-b-2 border-hairline bg-sheet">
      <div className="mx-auto flex max-w-xl flex-wrap items-center justify-end gap-2 px-4 py-2">
        <LogoMark className="mr-auto h-8 w-8" />
        <span className="sr-only">{view.clinicName}</span>
        <button
          type="button"
          aria-expanded={panel === "size"}
          aria-label="Μέγεθος γραμμάτων"
          onClick={() => toggle("size")}
          className={cx(barButton, panel === "size" ? "border-ink bg-white" : "border-line bg-sheet")}
        >
          Αα
        </button>
        {!finished && (
          <button
            type="button"
            aria-expanded={panel === "call"}
            aria-label="Χρειάζομαι τον φυσιοθεραπευτή"
            onClick={() => toggle("call")}
            disabled={Boolean(view.call)}
            className={cx(barButton, "border-action text-action disabled:border-line disabled:text-muted", panel === "call" ? "bg-note-green" : "bg-sheet")}
          >
            Φυσιοθεραπευτής
          </button>
        )}
      </div>

      {panel === "size" && (
        <div className="mx-auto max-w-xl px-4 pb-4">
          <TextSizeControl value={textSize} onChange={changeTextSize} />
        </div>
      )}

      {panel === "call" && !view.call && (
        <fieldset className="mx-auto flex max-w-xl flex-col gap-3 px-4 pb-4">
          <legend className="mb-3 pt-1 font-bold">Γιατί χρειάζεστε τον φυσιοθεραπευτή;</legend>
          <button type="button" disabled={pending} onClick={() => void call("question")} className="min-h-[3.25rem] cursor-pointer border-[3px] border-action bg-white font-bold text-action">
            Έχω απορία
          </button>
          <button type="button" disabled={pending} onClick={() => void call("pain")} className="min-h-[3.25rem] cursor-pointer bg-error font-bold text-white">
            Πονάω
          </button>
          <button type="button" onClick={() => setPanel("none")} className={cx(link, "self-center")}>
            Πίσω
          </button>
        </fieldset>
      )}

      {view.call && (
        <div role="status" className={cx(view.call.reason === "pain" ? "bg-tab-pink" : "bg-tab-yellow")}>
          <div className="mx-auto flex max-w-xl flex-wrap items-center justify-between gap-x-4 px-4 py-2">
            <p className="font-bold">
              Ο φυσιοθεραπευτής ειδοποιήθηκε. {view.call.reason === "pain" ? "Είπατε ότι πονάτε." : "Είπατε ότι έχετε απορία."}
            </p>
            <button type="button" disabled={pending} onClick={() => void send({ type: "cancelCall" })} className={link}>
              Ακύρωση κλήσης
            </button>
          </div>
        </div>
      )}

      {offline && (
        <div role="alert" className="bg-tab-pink">
          <div className="mx-auto flex max-w-xl flex-wrap items-center justify-between gap-x-4 px-4 py-2">
            <p className="font-bold">Δεν υπάρχει σύνδεση. Δοκιμάζουμε ξανά μόνο του.</p>
            <button type="button" onClick={() => void refresh()} className={link}>
              Δοκιμάστε ξανά
            </button>
          </div>
        </div>
      )}
    </header>
  );

  // ---------- after «Τέλος» from the staff ----------
  if (finished) {
    return (
      <div className="desk-pattern min-h-dvh text-[1rem] leading-normal">
        {topBar}
        <main id="main" className="mx-auto flex min-h-dvh max-w-xl flex-col gap-4 bg-sheet px-4 pt-10 pb-16">
          <p aria-hidden="true" className="font-display text-[3rem] leading-none text-action">
            ✓
          </p>
          <h1 className="font-display text-[1.8rem] leading-tight">Η συνεδρία ολοκληρώθηκε</h1>
          <p>Ευχαριστούμε! Το πρόγραμμα για το σπίτι είναι έτοιμο.</p>
          {view.homeToken && (
            <a
              href={`/p/${view.homeToken}`}
              className="mt-4 flex min-h-[3.5rem] items-center justify-center bg-action px-4 text-[1.1rem] font-bold text-white no-underline hover:bg-action-hover hover:text-white"
            >
              Το πρόγραμμα για το σπίτι
            </a>
          )}
        </main>
      </div>
    );
  }

  return (
    <div className="desk-pattern min-h-dvh text-[1rem] leading-normal">
      {topBar}

      <main id="main" className="mx-auto flex min-h-dvh max-w-xl flex-col gap-6 bg-sheet px-4 pt-4 pb-[11rem]">
        {/* Where we are: «Άσκηση 1 από 3», a thin line in parts, «Όλες» opens the list. */}
        <nav aria-label="Οι ασκήσεις της συνεδρίας" className="flex flex-col gap-2">
          <div className="flex items-baseline justify-between gap-4">
            <p className="text-muted" aria-live="polite">
              {exercise ? `Άσκηση ${shown + 1} από ${total}` : `${exercisesDone(view)} από ${total} ασκήσεις έγιναν`}
            </p>
            {total > 1 && (
              <button type="button" aria-expanded={panel === "list"} onClick={() => toggle("list")} className={link}>
                {panel === "list" ? "Κλείσιμο" : "Όλες οι ασκήσεις"}
              </button>
            )}
          </div>
          <div className="flex gap-1.5" aria-hidden="true">
            {view.setsTarget.map((_, i) => (
              <span key={i} className={cx("h-2 flex-1", isDone(view, i) ? "bg-action" : i === shown ? "bg-ink" : "bg-hairline")} />
            ))}
          </div>

          {panel === "list" && (
            <ol className="mt-2 border-t-2 border-hairline">
              {view.program.exercises.map((e, i) => (
                <li key={i} className="border-b border-hairline">
                  <button
                    type="button"
                    onClick={() => goTo(i)}
                    aria-current={i === shown ? "step" : undefined}
                    className="flex min-h-[3.25rem] w-full cursor-pointer items-center gap-3 py-2 text-left hover:bg-note-green"
                  >
                    <span className="w-6 shrink-0 font-bold text-muted">{i + 1}</span>
                    <span className={cx("flex-1", i === shown && "font-bold")}>{e.name}</span>
                    <span className="shrink-0 text-muted">{isDone(view, i) ? "✓ έγινε" : i === shown ? "τώρα" : ""}</span>
                  </button>
                </li>
              ))}
            </ol>
          )}
        </nav>

        {justFinished && exercise && (
          <p role="status" className="font-bold text-action">
            ✓ «{justFinished}» έγινε. Τώρα:
          </p>
        )}

        {exercise ? (
          <section aria-labelledby="exercise-name" className="flex flex-col gap-5">
            <div className="flex flex-col gap-1">
              <h1 id="exercise-name" className="font-display text-[1.6rem] leading-tight">
                {exercise.name}
              </h1>
              {todayDose(exercise).map((line) => (
                <p key={line} className="text-[1.1rem]">
                  {line}
                </p>
              ))}
              {!isBlank(exercise.notes) && <p className="text-muted">{exercise.notes}</p>}
            </div>

            {/* The set counter: the biggest thing on the screen. */}
            <div>
              <p className="text-muted">Σετ</p>
              {allSetsDone ? (
                <p className="font-display text-[2.4rem] leading-tight text-action">✓ Έγινε</p>
              ) : (
                <p className="font-display leading-none">
                  <span className="text-[4.5rem]">{setNumber}</span>
                  <span className="text-[1.5rem] text-muted"> από {sets}</span>
                </p>
              )}
              {sets > 1 && (
                <ol className="mt-3 flex gap-2.5">
                  {Array.from({ length: sets }, (_, i) => (
                    <li
                      key={i}
                      className={cx(
                        "size-[1.1rem] rounded-full border-2",
                        i < setsDone ? "border-action bg-action" : i === setsDone ? "border-ink" : "border-line",
                      )}
                    >
                      <span className="sr-only">{`Σετ ${i + 1}${i < setsDone ? ", έγινε" : ""}`}</span>
                    </li>
                  ))}
                </ol>
              )}
            </div>

            {hold && !allSetsDone && <HoldTimer key={`${shown}-${setNumber}`} seconds={hold} />}

            {next && (
              <p className="border-t border-hairline pt-3 text-muted">
                Μετά: <span className="text-ink">{next.name}</span>
              </p>
            )}
            {!next && !allSetsDone && <p className="border-t border-hairline pt-3 text-muted">Αυτή είναι η τελευταία άσκηση.</p>}
          </section>
        ) : (
          <section aria-labelledby="all-done" className="flex flex-col gap-3 pt-6">
            <p aria-hidden="true" className="font-display text-[3rem] leading-none text-action">
              ✓
            </p>
            <h1 id="all-done" className="font-display text-[1.8rem] leading-tight">
              Τελειώσατε τις ασκήσεις
            </h1>
            <p>Μπράβο! Ο φυσιοθεραπευτής το βλέπει στην οθόνη του.</p>
          </section>
        )}
      </main>

      {/* Under the thumb: the one thing to press, and a small «Αναίρεση». */}
      <div className="fixed inset-x-0 bottom-0 border-t-2 border-hairline bg-sheet pb-[env(safe-area-inset-bottom)]">
        <div className="mx-auto flex max-w-xl flex-col items-center gap-1 px-4 pt-3 pb-2">
          {exercise && !allSetsDone && (
            <button
              type="button"
              disabled={pending}
              aria-busy={pending}
              onClick={() => void finishSet()}
              className="flex min-h-[3.75rem] w-full cursor-pointer items-center justify-center bg-action px-4 text-[1.15rem] font-bold text-white hover:bg-action-hover disabled:cursor-wait disabled:opacity-80"
            >
              {sets > 1 ? `Τελείωσα το σετ ${setNumber}` : "Τελείωσα την άσκηση"}
            </button>
          )}
          {exercise && allSetsDone && next && (
            <button
              type="button"
              onClick={() => goTo(nextIndex)}
              className="flex min-h-[3.75rem] w-full cursor-pointer items-center justify-center bg-action px-4 text-[1.15rem] font-bold text-white hover:bg-action-hover"
            >
              Στην επόμενη άσκηση
            </button>
          )}
          <button type="button" disabled={pending || undoTarget < 0} onClick={() => void undo()} className={link}>
            {undoTarget >= 0 && view.setsTarget[undoTarget] > 1 ? "Αναίρεση τελευταίου σετ" : "Αναίρεση"}
          </button>
        </div>
      </div>
    </div>
  );
}
