"use client";
// The exercises as a path through the day (the «Path» in PhysioPath): numbered circles joined by a line,
// each exercise beside its circle with its name, how much to do in full words, the physio's notes and
// two buttons: «Το έκανα σήμερα» and «Δεν μπόρεσα». A press opens a small box for the pain (0–10) and a
// note (FeedbackPanel); a pain of 7 or more shows the clinic's phone. Done turns the circle into a green
// ✓ and the path after it green; «Σήμερα: 1 από 4» says it in words.
// Everything is saved in the clinic's diary (home_logs, through /api/p/<token>), so the physio sees it
// and the patient finds it again on any phone. A press shows at once; if it can't be saved (no
// internet), it is taken back and the page says so.
// «Οι τελευταίες 7 μέρες» (PastDays) picks the day: a forgotten day can still be ticked, from the day
// the program was given.
// On paper the buttons give way to a week of boxes to tick with a pen on the fridge (in two columns when
// the page has no instructions column beside them).
import { useEffect, useRef, useState } from "react";

import { cx } from "@/app/lib/cx";
import {
  doneOn,
  entryFor,
  isHighPain,
  lastDays,
  localDay,
  LogAnswer,
  longDayName,
  withChange,
  type LogChange,
  type LogEntry,
} from "@/app/lib/home/log";
import { FeedbackPanel } from "@/app/p/[token]/FeedbackPanel";
import { PastDays } from "@/app/p/[token]/PastDays";

export type ChecklistExercise = {
  index: number; // its place in the program (what the diary saves): blank rows are not on the letter
  name: string;
  dose: string[]; // e.g. ["3 σετ × 10 επαναλήψεις", "Κρατήστε 5 δευτερόλεπτα", "2 φορές τη μέρα"]
  notes: string | null;
};

const DAYS = ["Δευ", "Τρί", "Τετ", "Πέμ", "Παρ", "Σάβ", "Κυρ"];
const telHref = (phone: string) => `tel:${phone.replace(/[^\d+]/g, "")}`;

type Status = "done" | "skipped";

type Props = {
  token: string;
  exercises: ChecklistExercise[];
  log: LogEntry[]; // the last 7 days, as home_program returned them
  today: string; // the clinic's day when the page was made; the device's own day replaces it
  firstDay: string; // the day the program was given: nothing before it can be ticked
  clinicPhone: string | null;
  // On paper, two columns of exercises: when nothing else sits beside the list.
  printColumns?: boolean;
};

export function ExerciseChecklist({ token, exercises, log: initialLog, today: pageDay, firstDay, clinicPhone, printColumns = false }: Props) {
  const [log, setLog] = useState(initialLog);
  const [today, setToday] = useState(pageDay);
  const [day, setDay] = useState(pageDay);
  const [open, setOpen] = useState<number | null>(null); // the exercise whose pain/note box is open
  const [saving, setSaving] = useState<number[]>([]);
  const [failed, setFailed] = useState<number | null>(null);
  const todayRef = useRef(pageDay);

  // The device's own day (the page was made with the clinic's), again whenever the patient comes back
  // to the page: one left open overnight moves on to the new day (if it was showing the old one).
  useEffect(() => {
    function sync() {
      const now = localDay();
      const old = todayRef.current;
      if (now < firstDay || now === old) return;
      todayRef.current = now;
      setToday(now);
      setDay((shown) => (shown === old ? now : shown));
    }
    sync();
    document.addEventListener("visibilitychange", sync);
    return () => document.removeEventListener("visibilitychange", sync);
  }, [firstDay]);

  const indexes = exercises.map((exercise) => exercise.index);
  const total = exercises.length;
  const done = doneOn(log, day, indexes);
  const allDone = total > 0 && done === total;
  const isToday = day === today;

  // Saves one change. The screen shows it at once; the server's answer then replaces the diary with
  // what was really saved. Returns whether it was saved.
  async function send(change: LogChange): Promise<boolean> {
    const previous = entryFor(log, change.day, change.exercise);
    setLog((current) => withChange(current, change));
    setSaving((current) => [...current, change.exercise]);
    setFailed(null);
    try {
      const response = await fetch(`/api/p/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(change),
      });
      if (!response.ok) throw new Error(`status ${response.status}`);
      const answer = LogAnswer.parse(await response.json());
      if (answer.status === "newer") {
        window.location.reload(); // the page then says a newer program exists
        return false;
      }
      setLog(answer.log);
      return true;
    } catch {
      setLog((current) =>
        withChange(current, previous ?? { day: change.day, exercise: change.exercise, status: null, pain: null, note: null }),
      );
      setFailed(change.exercise);
      return false;
    } finally {
      setSaving((current) => current.filter((exercise) => exercise !== change.exercise));
    }
  }

  function press(exercise: number, status: Status) {
    const entry = entryFor(log, day, exercise);
    if (entry?.status === status) {
      // The same button again: taken back (pressed by mistake).
      setOpen((current) => (current === exercise ? null : current));
      void send({ day, exercise, status: null, pain: null, note: null });
      return;
    }
    void send({ day, exercise, status, pain: entry?.pain ?? null, note: entry?.note ?? null });
    setOpen(exercise);
  }

  async function saveFeedback(exercise: number, pain: number | null, note: string | null) {
    const entry = entryFor(log, day, exercise);
    if (!entry) return;
    if (await send({ day, exercise, status: entry.status, pain, note })) setOpen(null);
  }

  function selectDay(next: string) {
    setDay(next);
    setOpen(null);
    setFailed(null);
  }

  return (
    <section aria-labelledby="exercises-title" className="flex flex-col gap-5">
      <PastDays days={lastDays(today)} today={today} selected={day} firstDay={firstDay} log={log} exercises={indexes} onSelect={selectDay} />

      {/* The chosen day, at a glance: «Σήμερα», or the day's name when an earlier day is chosen. On paper
          (a week on the fridge) it's «Οι ασκήσεις» with the day boxes explained instead. */}
      <div className="flex flex-col gap-2.5 print:hidden">
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <h2 id="exercises-title" className="font-display text-[1.6rem] leading-tight">
            {isToday ? "Σήμερα" : longDayName(day)}
          </h2>
          <p aria-live="polite" className="text-[1.15rem]">
            <span className="font-bold">{done}</span> από {total} {total === 1 ? "άσκηση" : "ασκήσεις"}
          </p>
        </div>
        <div aria-hidden="true" className="flex gap-1.5">
          {indexes.map((exercise) => (
            <span key={exercise} className={cx("h-2.5 flex-1", entryFor(log, day, exercise)?.status === "done" ? "bg-action" : "bg-hairline")} />
          ))}
        </div>
        {allDone ? (
          <p role="status" className="flex items-center gap-3 bg-note-green px-4 py-3 font-bold">
            <span aria-hidden="true" className="grid size-[2rem] flex-none place-items-center rounded-full bg-action text-white">
              ✓
            </span>
            {isToday ? "Μπράβο! Κάνατε όλες τις ασκήσεις σήμερα." : "Κάνατε όλες τις ασκήσεις αυτή τη μέρα."}
          </p>
        ) : (
          <p className="text-muted">
            {isToday ? "Πατήστε «Το έκανα σήμερα» μόλις κάνετε μια άσκηση." : "Σημειώστε τι κάνατε αυτή τη μέρα."}
          </p>
        )}
        {!isToday && (
          <button
            type="button"
            onClick={() => selectDay(today)}
            className="min-h-[3rem] cursor-pointer self-start font-bold text-action underline hover:text-action-hover"
          >
            Πίσω στο σήμερα
          </button>
        )}
      </div>
      <div className="hidden print:flex print:flex-col print:gap-1">
        <p className="font-display text-[1.5rem] leading-tight">Οι ασκήσεις</p>
        <p>Σημειώστε ✓ στο κουτάκι της ημέρας, κάθε μέρα που κάνετε την άσκηση.</p>
      </div>

      <ol className={cx("flex flex-col print:block", printColumns && "print:columns-2 print:gap-10")}>
        {exercises.map((exercise, i) => {
          const entry = entryFor(log, day, exercise.index);
          const isDone = entry?.status === "done";
          const isSkipped = entry?.status === "skipped";
          const isSaving = saving.includes(exercise.index);
          return (
            <li
              key={exercise.index}
              className="relative grid grid-cols-[2.1rem_minmax(0,1fr)] gap-x-3 pb-9 last:pb-1 sm:grid-cols-[2.4rem_minmax(0,1fr)] sm:gap-x-5 print:mb-5 print:break-inside-avoid print:pb-0"
            >
              {/* The path on to the next exercise: green once this one is done. */}
              {i < total - 1 && (
                <span
                  aria-hidden="true"
                  className={cx(
                    "absolute top-[2.1rem] bottom-0 left-[1.05rem] w-[3px] -translate-x-1/2 sm:top-[2.4rem] sm:left-[1.2rem] print:hidden",
                    isDone ? "bg-action" : "bg-hairline",
                  )}
                />
              )}
              <span
                aria-hidden="true"
                className={cx(
                  "relative grid size-[2.1rem] place-items-center rounded-full border-[3px] font-display text-[1.05rem] leading-none sm:size-[2.4rem] sm:text-[1.15rem]",
                  isDone ? "border-action bg-action text-white" : isSkipped ? "border-muted bg-hairline text-ink" : "border-ink bg-sheet text-ink",
                  "print:border-ink print:bg-sheet print:text-ink",
                )}
              >
                <span className="print:hidden">{isDone ? "✓" : isSkipped ? "✗" : i + 1}</span>
                <span className="hidden print:inline">{i + 1}</span>
              </span>

              <div className="flex min-w-0 flex-col gap-3 pt-[0.15rem] sm:pt-[0.3rem]">
                <h3 className="font-display text-[min(1.3rem,7vw)] leading-snug text-pretty sm:text-[1.3rem]">
                  <span className="sr-only">{`Άσκηση ${i + 1}:`}</span> {exercise.name}
                </h3>
                {exercise.dose.length > 0 && (
                  <ul className="flex flex-col gap-0.5 text-[min(1.1rem,8vw)] sm:text-[1.1rem]">
                    {exercise.dose.map((line, j) => (
                      <li key={j} className={cx(j === 0 && "font-bold")}>
                        {line}
                      </li>
                    ))}
                  </ul>
                )}
                {exercise.notes && <p>{exercise.notes}</p>}

                <div className="mt-1 grid gap-2 sm:grid-cols-2 print:hidden">
                  <PressButton pressed={isDone} tone="done" onClick={() => press(exercise.index, "done")} label={isToday ? "Το έκανα σήμερα" : "Το έκανα"} name={exercise.name} />
                  <PressButton pressed={isSkipped} tone="skipped" onClick={() => press(exercise.index, "skipped")} label="Δεν μπόρεσα" name={exercise.name} />
                </div>

                {failed === exercise.index && (
                  <p role="alert" className="bg-tab-pink px-3 py-2 font-bold print:hidden">
                    Δεν αποθηκεύτηκε. Ελέγξτε τη σύνδεση και δοκιμάστε ξανά.
                  </p>
                )}

                {entry && open === exercise.index ? (
                  <FeedbackPanel
                    key={`${day}-${exercise.index}`}
                    exerciseName={exercise.name}
                    pain={entry.pain}
                    note={entry.note}
                    saving={isSaving}
                    onSave={(pain, note) => void saveFeedback(exercise.index, pain, note)}
                    onClose={() => setOpen(null)}
                  />
                ) : entry ? (
                  <Saved entry={entry} name={exercise.name} onChange={() => setOpen(exercise.index)} />
                ) : null}

                {entry && isHighPain(entry.pain) && (
                  <div className="flex flex-col gap-2 bg-tab-pink px-4 py-3 print:hidden">
                    <p className="font-bold">Ο πόνος είναι δυνατός.</p>
                    <p>Η κλινική θα το δει, αλλά όχι αμέσως. Αν δεν περνά, τηλεφωνήστε μας.</p>
                    {clinicPhone && (
                      <a
                        href={telHref(clinicPhone)}
                        aria-label={`Καλέστε μας, ${clinicPhone}`}
                        className="flex min-h-[3.25rem] items-center justify-center gap-2 bg-action px-4 py-2 font-bold text-white no-underline hover:bg-action-hover hover:text-white"
                      >
                        Καλέστε μας · <span className="whitespace-nowrap">{clinicPhone}</span>
                      </a>
                    )}
                  </div>
                )}

                {/* On paper: a week of boxes to tick with a pen. */}
                <div className="hidden print:block">
                  <ol aria-label="Οι μέρες της εβδομάδας" className="flex gap-1.5">
                    {DAYS.map((name) => (
                      <li key={name} className="flex flex-col items-center gap-0.5">
                        <span className="size-[1.7rem] border-2 border-ink" />
                        <span className="text-[0.85rem]">{name}</span>
                      </li>
                    ))}
                  </ol>
                </div>
              </div>
            </li>
          );
        })}
      </ol>

      <p className="text-muted print:hidden">Ό,τι σημειώνετε εδώ το βλέπει ο φυσιοθεραπευτής σας.</p>
    </section>
  );
}

// «Το έκανα σήμερα» or «Δεν μπόρεσα»: like a box with its label, left-aligned so a big text size wraps
// cleanly. Pressed is calm (pale, the box ticked): the circle beside the exercise already says it.
function PressButton({ pressed, tone, onClick, label, name }: { pressed: boolean; tone: Status; onClick: () => void; label: string; name: string }) {
  const done = tone === "done";
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={onClick}
      className={cx(
        "flex min-h-[3.25rem] w-full cursor-pointer items-center justify-start gap-2.5 border-[3px] px-3 py-2 text-left text-[1.05rem] font-bold sm:justify-center sm:gap-3 sm:px-4",
        done
          ? pressed
            ? "border-note-green bg-note-green text-ink hover:border-action"
            : "border-action bg-white text-action hover:text-action-hover"
          : pressed
            ? "border-hairline bg-hairline text-ink hover:border-muted"
            : "border-line bg-white text-ink hover:border-muted",
      )}
    >
      <span
        aria-hidden="true"
        className={cx(
          "grid size-[1.35rem] flex-none place-items-center border-2 text-[0.95rem] leading-none",
          done ? "border-action" : "border-muted",
          pressed && (done ? "bg-action text-white" : "bg-muted text-white"),
        )}
      >
        {pressed ? (done ? "✓" : "✗") : ""}
      </span>
      {label}
      <span className="sr-only">{`: ${name}`}</span>
    </button>
  );
}

// What was saved with the press, and a way to change it.
function Saved({ entry, name, onChange }: { entry: LogEntry; name: string; onChange: () => void }) {
  const said = entry.pain !== null || entry.note !== null;
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 print:hidden">
      {said && (
        <p className="min-w-0">
          {entry.pain !== null && <span className="font-bold">Πόνος {entry.pain} από 10</span>}
          {entry.pain !== null && entry.note && " · "}
          {entry.note && <span className="break-words">«{entry.note}»</span>}
        </p>
      )}
      <button type="button" onClick={onChange} className="min-h-[3rem] cursor-pointer font-bold text-action underline hover:text-action-hover">
        {said ? "Αλλαγή" : "Πόνος ή σημείωση"}
        <span className="sr-only">{`: ${name}`}</span>
      </button>
    </div>
  );
}
