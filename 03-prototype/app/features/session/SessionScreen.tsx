"use client";
// The patient's screen during the session, on their phone (QR) or a clinic tablet.
// One exercise at a time, big and simple: what to do, which set, one big "Τελείωσα" button, and the
// next exercise appears by itself. A button calls the physio; it only passes the message on, never advises.
// Built for old phones and older patients: plain requests every few seconds, no websockets, large text.
import type { Route } from "next";
import { useCallback, useEffect, useRef, useState } from "react";

import { BrandMark } from "@/app/components/layout/BrandMark";
import { Alert } from "@/app/components/ui/Alert";
import { Button, ButtonLink } from "@/app/components/ui/Button";
import { CheckIcon, UndoIcon } from "@/app/components/ui/icons";
import { TextSizeControl, useTextSize } from "@/app/features/patient/TextSize";
import { HoldTimer } from "@/app/features/session/HoldTimer";
import { getPatientSession, sendPatientAction } from "@/app/lib/api";
import { cx } from "@/app/lib/cx";
import { doseLines, holdSeconds, isBlank } from "@/app/lib/format";
import type { PatientAction, PatientSessionView } from "@/app/lib/session";
import { currentExercise, exercisesDone, lastDoneExercise, setsTarget } from "@/app/lib/session";

const POLL_MS = 3000; // picks up the physio's side: a call they saw, the session closed

export function SessionScreen({ initial, clinicName }: { initial: PatientSessionView; clinicName?: string }) {
  const [view, setView] = useState(initial);
  const [pending, setPending] = useState(false);
  const [offline, setOffline] = useState(false);
  const [choosingCall, setChoosingCall] = useState(false);
  const [justFinished, setJustFinished] = useState<string | null>(null);
  const [textSize, changeTextSize] = useTextSize();
  const pendingRef = useRef(false);

  const current = currentExercise(view);
  const total = view.program.exercises.length;
  const exercise = current >= 0 ? view.program.exercises[current] : null;
  const sets = current >= 0 ? setsTarget(view, current) : 0;
  const setNumber = current >= 0 ? view.setsDone[current] + 1 : 0;
  const undoTarget = lastDoneExercise(view);

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
    if (!exercise) return;
    const name = exercise.name;
    const lastSet = setNumber >= sets;
    if ((await send({ type: "setDone", exercise: current, set: setNumber })) && lastSet) setJustFinished(name);
  }

  const header = (
    <header className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 border-b border-border pb-4">
      <p className="flex items-center gap-3">
        <BrandMark />
        <span className="label-mono">{clinicName ?? "PhysioPath"}</span>
      </p>
      <p className="label-mono text-muted">Δείγμα · φανταστικός ασθενής</p>
    </header>
  );

  // ---- closed by the physio ----
  if (view.finishedAt) {
    return (
      <div className="mx-auto max-w-2xl px-4 pt-6 pb-16">
        {header}
        <main id="main" className="mt-12">
          <h1 className="text-5xl leading-[0.95] font-extrabold tracking-tight italic">Η συνεδρία ολοκληρώθηκε.</h1>
          <p className="mt-4 text-xl">Ευχαριστούμε! Το πρόγραμμα για το σπίτι είναι έτοιμο.</p>
          {view.approvedId && (
            <ButtonLink href={`/p/${view.approvedId}` as Route} reloadDocument variant="primary" size="xl" className="mt-8">
              Το πρόγραμμα για το σπίτι
            </ButtonLink>
          )}
        </main>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 pt-6 pb-16">
      {header}

      <main id="main" className="mt-8">
        <p className="label-mono text-muted">
          {view.program.patient_first_name ? `${view.program.patient_first_name} · ` : ""}Η σημερινή συνεδρία
        </p>

        {/* Progress: one block per exercise */}
        <div className="mt-3">
          <p className="text-lg font-semibold" aria-live="polite">
            {current >= 0 ? `Άσκηση ${current + 1} από ${total}` : `${exercisesDone(view)} από ${total} ασκήσεις`}
          </p>
          <ol aria-hidden="true" className="mt-2 flex gap-1.5">
            {view.program.exercises.map((e, i) => (
              <li
                key={i}
                className={cx("h-2.5 flex-1", i === current ? "bg-primary" : view.setsDone[i] >= setsTarget(view, i) ? "bg-success" : "bg-surface-muted")}
              />
            ))}
          </ol>
        </div>

        {offline && (
          <Alert tone="danger" title="Χάθηκε η σύνδεση" className="mt-6" action={<Button onClick={() => void refresh()}>Δοκιμάστε ξανά</Button>}>
            Το κινητό δεν βρίσκει τον υπολογιστή του φυσιοθεραπευτή. Ελέγξτε ότι είστε στο ίδιο Wi-Fi.
          </Alert>
        )}

        {justFinished && current >= 0 && (
          <p role="status" className="mt-6 flex items-center gap-2 text-lg font-semibold text-success">
            <CheckIcon size={20} /> «{justFinished}» ολοκληρώθηκε. Επόμενη άσκηση:
          </p>
        )}

        {exercise ? (
          <section aria-labelledby="exercise-name" className="mt-6 border-t border-border pt-6">
            <h1 id="exercise-name" className="text-4xl leading-tight font-extrabold tracking-tight">
              {exercise.name}
            </h1>
            <ul className="mt-4 space-y-1 text-2xl font-semibold">
              {doseLines({ ...exercise, frequency: null }).map((line) => ( // today: sets, reps, hold; "how often" is for home
                <li key={line}>{line}</li>
              ))}
            </ul>
            {!isBlank(exercise.notes) && <p className="mt-3 text-xl text-muted">{exercise.notes}</p>}

            {sets > 1 && (
              <div className="mt-8">
                <p className="label-mono text-muted">
                  Σετ {setNumber} από {sets}
                </p>
                <ol className="mt-2 flex flex-wrap gap-2">
                  {Array.from({ length: sets }, (_, i) => {
                    const done = i < view.setsDone[current];
                    return (
                      <li
                        key={i}
                        className={cx(
                          "grid size-12 place-items-center rounded-sm border-2 text-lg font-bold",
                          done ? "border-success bg-success text-background" : i === view.setsDone[current] ? "border-primary text-foreground" : "border-border-strong text-muted",
                        )}
                      >
                        {done ? <CheckIcon size={22} /> : i + 1}
                        <span className="sr-only">{done ? " (έγινε)" : ""}</span>
                      </li>
                    );
                  })}
                </ol>
              </div>
            )}

            {holdSeconds(exercise.hold) && <HoldTimer key={`${current}-${setNumber}`} seconds={holdSeconds(exercise.hold)!} />}

            <Button variant="primary" size="xl" icon={<CheckIcon />} loading={pending} onClick={() => void finishSet()} className="mt-8 min-h-16 w-full text-xl">
              {sets > 1 ? `Τελείωσα το σετ ${setNumber}` : "Τελείωσα την άσκηση"}
            </Button>

            {current + 1 < total && (
              <p className="mt-4 text-lg text-muted">
                <span className="label-mono">Μετά</span> {view.program.exercises[current + 1].name}
              </p>
            )}
          </section>
        ) : (
          <section className="mt-6 border-t border-border pt-6">
            <h1 className="text-5xl leading-[0.95] font-extrabold tracking-tight italic">
              Τελειώσατε τις ασκήσεις
              <span aria-hidden="true" className="text-primary">
                .
              </span>
            </h1>
            <p className="mt-4 text-xl">Μπράβο! Ο φυσιοθεραπευτής το βλέπει στην οθόνη του.</p>
          </section>
        )}

        {undoTarget >= 0 && (
          <Button variant="ghost" icon={<UndoIcon />} disabled={pending} onClick={() => void send({ type: "undoSet", exercise: undoTarget })} className="mt-4">
            Αναίρεση τελευταίου σετ
          </Button>
        )}

        {/* Calling the physio: only passes the message on. */}
        <div className="mt-12 border-t border-border pt-6">
          {view.call ? (
            <>
              <Alert title="Ο φυσιοθεραπευτής ειδοποιήθηκε">{view.call.reason === "pain" ? "Είπατε ότι πονάτε." : "Είπατε ότι έχετε απορία."}</Alert>
              <Button disabled={pending} onClick={() => void send({ type: "cancelCall" })} className="mt-4">
                Ακύρωση κλήσης
              </Button>
            </>
          ) : choosingCall ? (
            <fieldset>
              <legend className="text-lg font-semibold">Γιατί χρειάζεστε τον φυσιοθεραπευτή;</legend>
              <div className="mt-3 flex flex-wrap gap-3">
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
            <Button size="xl" onClick={() => setChoosingCall(true)} className="w-full">
              Χρειάζομαι τον φυσιοθεραπευτή
            </Button>
          )}
        </div>

        <div className="mt-12">
          <TextSizeControl value={textSize} onChange={changeTextSize} />
        </div>
      </main>
    </div>
  );
}
