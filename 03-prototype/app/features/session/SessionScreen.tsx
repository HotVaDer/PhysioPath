"use client";
// The patient's screen during the session, on their phone (QR) or a clinic tablet.
// One exercise at a time, big and simple: what to do, which set, one big "Τελείωσα" button, and the
// next exercise appears by itself. Numbered boxes at the top let the patient go to another exercise.
// A button calls the physio; it only passes the message on, never advises.
// Built for old phones and older patients: plain requests every few seconds, no websockets, large text.
import type { Route } from "next";
import { useCallback, useEffect, useRef, useState } from "react";

import { BrandMark } from "@/app/components/layout/BrandMark";
import { Alert } from "@/app/components/ui/Alert";
import { Button, ButtonLink } from "@/app/components/ui/Button";
import { ChatIcon, CheckIcon, TapIcon, UndoIcon } from "@/app/components/ui/icons";
import { TextSizeControl, useTextSize } from "@/app/features/patient/TextSize";
import { HoldTimer } from "@/app/features/session/HoldTimer";
import { getPatientSession, sendPatientAction } from "@/app/lib/api";
import { cx } from "@/app/lib/cx";
import { doseLines, holdSeconds, isBlank } from "@/app/lib/format";
import type { PatientAction, PatientSessionView } from "@/app/lib/session";
import { currentExercise, exercisesDone, lastDoneExercise, setsTarget } from "@/app/lib/session";

const POLL_MS = 3000; // picks up the physio's side: a call they saw, the session closed

// Today's dose on one line: sets, reps, hold. "How often" is for the home program.
const todayDose = (exercise: PatientSessionView["program"]["exercises"][number]) => doseLines({ ...exercise, frequency: null });

export function SessionScreen({ initial, clinicName }: { initial: PatientSessionView; clinicName?: string }) {
  const [view, setView] = useState(initial);
  const [pending, setPending] = useState(false);
  const [offline, setOffline] = useState(false);
  const [choosingCall, setChoosingCall] = useState(false);
  const [justFinished, setJustFinished] = useState<string | null>(null);
  const [chosen, setChosen] = useState<number | null>(null); // an exercise the patient tapped; null = the first one not done
  const [textSize, changeTextSize] = useTextSize();
  const pendingRef = useRef(false);

  const total = view.program.exercises.length;
  const shown = chosen ?? currentExercise(view); // -1 when everything is done
  const exercise = shown >= 0 ? view.program.exercises[shown] : null;
  const sets = shown >= 0 ? setsTarget(view, shown) : 0;
  const setsDone = shown >= 0 ? view.setsDone[shown] : 0;
  const allSetsDone = setsDone >= sets;
  const setNumber = setsDone + 1;
  const next = shown >= 0 ? view.program.exercises.at(shown + 1) : undefined;
  // Undo takes back a set of the exercise on screen. Following along, it can also reach the exercise
  // just finished (the screen has already moved on to the next one).
  const undoTarget = shown >= 0 && setsDone > 0 ? shown : chosen === null ? lastDoneExercise(view) : -1;

  // Poll for the physio's side, but not while one of our own taps is on its way.
  const refresh = useCallback(async () => {
    if (pendingRef.current || document.hidden) return;
    try {
      setView(await getPatientSession(initial.id));
      setOffline(false);
    } catch {
      setOffline(true);
    }
  }, [initial.id]);

  useEffect(() => {
    const timer = setInterval(() => void refresh(), POLL_MS);
    return () => clearInterval(timer);
  }, [refresh]);

  // Keep the screen on during the session where the browser allows it (not on plain-http phones).
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
    pendingRef.current = true;
    setPending(true);
    try {
      setView(await sendPatientAction(initial.id, action));
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
    const lastSet = setNumber >= sets;
    if ((await send({ type: "setDone", exercise: shown, set: setNumber })) && lastSet) {
      setJustFinished(name);
      setChosen(null); // on to the first exercise not done yet
    }
  }

  async function undo() {
    setJustFinished(null);
    await send({ type: "undoSet", exercise: undoTarget });
  }

  function goTo(i: number) {
    setJustFinished(null);
    setChosen(i);
  }

  const header = (
    <header className="flex flex-wrap items-center justify-between gap-x-6 gap-y-1 border-b border-border pb-3 text-[0.8rem]">
      <p className="flex items-center gap-2.5">
        <BrandMark />
        <span className="font-bold">{clinicName ?? "PhysioPath"}</span>
      </p>
      <p className="text-muted">{view.program.patient_first_name ? `${view.program.patient_first_name} · δείγμα` : "Δείγμα · φανταστικός ασθενής"}</p>
    </header>
  );

  // ---- closed by the physio ----
  if (view.finishedAt) {
    return (
      <div className="mx-auto max-w-xl px-4 pt-5 pb-16">
        {header}
        <main id="main" className="mt-10">
          <h1 className="text-[2rem] leading-tight font-bold">Η συνεδρία ολοκληρώθηκε</h1>
          <p className="mt-3 text-xl">Ευχαριστούμε! Το πρόγραμμα για το σπίτι είναι έτοιμο.</p>
          {view.approvedId && (
            <ButtonLink href={`/p/${view.approvedId}` as Route} reloadDocument variant="primary" size="xl" className="mt-8 w-full">
              Το πρόγραμμα για το σπίτι
            </ButtonLink>
          )}
        </main>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-xl px-4 pt-5 pb-16">
      {header}

      <main id="main" className="mt-4 flex flex-col gap-3">
        {/* The exercises: one numbered box each. Filled = done, thick ring = on screen now. */}
        <nav aria-label="Οι ασκήσεις της συνεδρίας" className="flex flex-col gap-2">
          <p className="label text-muted" aria-live="polite">
            {exercise ? `Άσκηση ${shown + 1} από ${total}` : `${exercisesDone(view)} από ${total} ασκήσεις έγιναν`}
          </p>
          <ol className="flex flex-wrap gap-2">
            {view.program.exercises.map((e, i) => {
              const complete = view.setsDone[i] >= setsTarget(view, i);
              const isShown = i === shown;
              return (
                <li key={i} className="min-w-[3.2rem] flex-1">
                  <button
                    type="button"
                    onClick={() => goTo(i)}
                    aria-current={isShown ? "step" : undefined}
                    aria-label={`Άσκηση ${i + 1}: ${e.name}${complete ? ", έγινε" : ""}${isShown ? ", τώρα" : ""}`}
                    className={cx(
                      "flex min-h-[2.6rem] w-full items-center justify-center gap-1.5 rounded-tile text-xl font-bold",
                      isShown
                        ? "border-3 border-primary bg-surface text-foreground ring-3 ring-success-bg"
                        : complete
                          ? "border-2 border-primary bg-primary text-on-primary"
                          : "border-2 border-border-strong bg-surface text-muted hover:bg-surface-muted",
                    )}
                  >
                    {complete && <CheckIcon size={22} />}
                    <span aria-hidden="true">{i + 1}</span>
                  </button>
                </li>
              );
            })}
          </ol>
          {total > 1 && (
            <p className="flex items-center gap-2 text-[0.8rem] text-muted">
              <TapIcon size={22} className="shrink-0 text-primary-text" />
              Πατήστε ένα κουτί για να πάτε σε άλλη άσκηση
            </p>
          )}
        </nav>

        {offline && (
          <Alert tone="danger" title="Χάθηκε η σύνδεση" action={<Button onClick={() => void refresh()}>Δοκιμάστε ξανά</Button>}>
            Το κινητό δεν βρίσκει τον υπολογιστή του φυσιοθεραπευτή. Ελέγξτε ότι είστε στο ίδιο Wi-Fi.
          </Alert>
        )}

        {justFinished && exercise && (
          <p role="status" className="flex items-center gap-2 text-lg font-bold text-success">
            <CheckIcon size={22} className="shrink-0" /> «{justFinished}» ολοκληρώθηκε. Επόμενη άσκηση:
          </p>
        )}

        {exercise ? (
          <section aria-labelledby="exercise-name" className="flex flex-col items-center gap-3 rounded-card border border-border bg-surface px-4 py-5 text-center">
            <h1 id="exercise-name" className="text-[1.7rem] leading-tight font-bold">
              {exercise.name}
            </h1>
            <ul className="text-[1.15rem] font-semibold">
              {todayDose(exercise).map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
            {!isBlank(exercise.notes) && <p className="text-muted">{exercise.notes}</p>}

            {sets > 1 && (
              <>
                <p className="label mt-1 text-muted">{allSetsDone ? "Όλα τα σετ έγιναν" : `Σετ ${setNumber} από ${sets}`}</p>
                <ol className="flex flex-wrap justify-center gap-3">
                  {Array.from({ length: sets }, (_, i) => {
                    const done = i < setsDone;
                    return (
                      <li
                        key={i}
                        className={cx(
                          "flex size-[2.8rem] items-center justify-center rounded-full border-3 text-[1.1rem] font-bold",
                          done ? "border-primary bg-primary text-on-primary" : i === setsDone ? "border-primary text-foreground" : "border-border-strong text-muted",
                        )}
                      >
                        {done ? <CheckIcon size={24} /> : i + 1}
                        <span className="sr-only">{done ? " (έγινε)" : ""}</span>
                      </li>
                    );
                  })}
                </ol>
              </>
            )}

            {holdSeconds(exercise.hold) && !allSetsDone && <HoldTimer key={`${shown}-${setNumber}`} seconds={holdSeconds(exercise.hold)!} />}
          </section>
        ) : (
          <section className="flex flex-col gap-2 rounded-card border border-primary bg-success-bg px-5 py-6 text-success">
            <h1 className="text-[1.7rem] leading-tight font-bold">Τελειώσατε τις ασκήσεις</h1>
            <p className="text-xl">Μπράβο! Ο φυσιοθεραπευτής το βλέπει στην οθόνη του.</p>
          </section>
        )}

        {exercise && (
          <Button
            variant="primary"
            size="xl"
            icon={<CheckIcon size={24} />}
            loading={pending}
            disabled={allSetsDone}
            onClick={() => void finishSet()}
            className="min-h-[3.4rem]! w-full"
          >
            {allSetsDone ? "Η άσκηση ολοκληρώθηκε" : sets > 1 ? `Τελείωσα το σετ ${setNumber}` : "Τελείωσα την άσκηση"}
          </Button>
        )}

        <Button variant="outline" size="xl" icon={<UndoIcon size={26} />} disabled={pending || undoTarget < 0} onClick={() => void undo()} className="w-full text-[0.95rem]!">
          {setsTarget(view, undoTarget >= 0 ? undoTarget : Math.max(shown, 0)) > 1 ? "Αναίρεση τελευταίου σετ" : "Αναίρεση"}
        </Button>

        {exercise && (
          <div className="flex flex-col gap-0.5 rounded-[18px] bg-surface-muted px-4 py-3">
            {next ? (
              <>
                <span className="label text-muted">Μετά</span>
                <span className="font-bold">{next.name}</span>
                {todayDose(next).length > 0 && <span className="text-base text-muted">{todayDose(next).join(" · ")}</span>}
              </>
            ) : (
              <>
                <span className="label text-muted">Αυτή είναι η τελευταία άσκηση</span>
                <span className="font-bold">Μετά τελειώνει η συνεδρία</span>
              </>
            )}
          </div>
        )}

        {/* Calling the physio: only passes the message on. */}
        <div className="mt-6">
          {view.call ? (
            <>
              <Alert title="Ο φυσιοθεραπευτής ειδοποιήθηκε">{view.call.reason === "pain" ? "Είπατε ότι πονάτε." : "Είπατε ότι έχετε απορία."}</Alert>
              <Button size="xl" disabled={pending} onClick={() => void send({ type: "cancelCall" })} className="mt-3 w-full">
                Ακύρωση κλήσης
              </Button>
            </>
          ) : choosingCall ? (
            <fieldset>
              <legend className="text-lg font-bold">Γιατί χρειάζεστε τον φυσιοθεραπευτή;</legend>
              <div className="mt-3 flex flex-col gap-3">
                <Button size="xl" disabled={pending} onClick={() => void send({ type: "call", reason: "question" }).then(() => setChoosingCall(false))}>
                  Έχω απορία
                </Button>
                <Button size="xl" variant="danger" disabled={pending} onClick={() => void send({ type: "call", reason: "pain" }).then(() => setChoosingCall(false))}>
                  Πονάω
                </Button>
                <Button variant="ghost" onClick={() => setChoosingCall(false)}>
                  Πίσω
                </Button>
              </div>
            </fieldset>
          ) : (
            <Button size="xl" icon={<ChatIcon size={22} />} onClick={() => setChoosingCall(true)} className="w-full text-[0.95rem]! font-semibold!">
              Χρειάζομαι τον φυσιοθεραπευτή
            </Button>
          )}
        </div>

        <div className="mt-8">
          <TextSizeControl value={textSize} onChange={changeTextSize} />
        </div>
      </main>
    </div>
  );
}
