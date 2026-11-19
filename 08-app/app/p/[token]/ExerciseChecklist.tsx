"use client";
// The exercises as a path through the day (the «Path» in PhysioPath): numbered circles joined by a line,
// each exercise beside its circle with its name, how much to do in full words, the physio's notes and
// one big «Το έκανα σήμερα» button. A tick turns the circle into a green ✓ and the stretch of path
// after it green, so the day's progress shows on the list itself; «Σήμερα: 1 από 4» says it in words.
// Ticks live only in this browser (ticks.ts). On paper the buttons give way to a week of boxes to tick
// with a pen on the fridge (in two columns when the page has no instructions column beside them).
// The first render has no ticks (it must match the server's); the saved ones appear right after.
import { useEffect, useState } from "react";

import { cx } from "@/app/lib/cx";
import { loadTicks, saveTicks, today } from "@/app/p/[token]/ticks";

export type ChecklistExercise = {
  name: string;
  dose: string[]; // e.g. ["3 σετ × 10 επαναλήψεις", "Κρατήστε 5 δευτερόλεπτα", "2 φορές τη μέρα"]
  notes: string | null;
};

const DAYS = ["Δευ", "Τρί", "Τετ", "Πέμ", "Παρ", "Σάβ", "Κυρ"];

type Props = {
  token: string;
  exercises: ChecklistExercise[];
  // On paper, two columns of exercises: when nothing else sits beside the list.
  printColumns?: boolean;
};

export function ExerciseChecklist({ token, exercises, printColumns = false }: Props) {
  const [done, setDone] = useState<number[]>([]);
  const total = exercises.length;
  const allDone = total > 0 && done.length === total;

  useEffect(() => {
    setDone(loadTicks(token, today(), total));
  }, [token, total]);

  function toggle(index: number) {
    // Read again first: the day may have changed, or another tab may have ticked something.
    const day = today();
    const current = loadTicks(token, day, total);
    const next = current.includes(index) ? current.filter((i) => i !== index) : [...current, index].sort((a, b) => a - b);
    saveTicks(token, day, next);
    setDone(next);
  }

  return (
    <section aria-labelledby="exercises-title" className="flex flex-col gap-5">
      {/* Today, at a glance: the section's title is the day itself. On paper (a week on the fridge) it's
          «Οι ασκήσεις» with the day boxes explained instead. */}
      <div className="flex flex-col gap-2.5 print:hidden">
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <h2 id="exercises-title" className="font-display text-[1.6rem] leading-tight">
            Σήμερα
          </h2>
          <p aria-live="polite" className="text-[1.15rem]">
            <span className="font-bold">{done.length}</span> από {total} {total === 1 ? "άσκηση" : "ασκήσεις"}
          </p>
        </div>
        <div aria-hidden="true" className="flex gap-1.5">
          {exercises.map((_, i) => (
            <span key={i} className={cx("h-2.5 flex-1", done.includes(i) ? "bg-action" : "bg-hairline")} />
          ))}
        </div>
        {allDone ? (
          <p role="status" className="flex items-center gap-3 bg-note-green px-4 py-3 font-bold">
            <span aria-hidden="true" className="grid size-[2rem] flex-none place-items-center rounded-full bg-action text-white">
              ✓
            </span>
            Μπράβο! Κάνατε όλες τις ασκήσεις σήμερα.
          </p>
        ) : (
          <p className="text-muted">Πατήστε «Το έκανα σήμερα» μόλις κάνετε μια άσκηση.</p>
        )}
      </div>
      <div className="hidden print:flex print:flex-col print:gap-1">
        <p className="font-display text-[1.5rem] leading-tight">Οι ασκήσεις</p>
        <p>Σημειώστε ✓ στο κουτάκι της ημέρας, κάθε μέρα που κάνετε την άσκηση.</p>
      </div>

      <ol className={cx("flex flex-col print:block", printColumns && "print:columns-2 print:gap-10")}>
        {exercises.map((exercise, i) => {
          const isDone = done.includes(i);
          return (
            <li
              key={i}
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
                  isDone ? "border-action bg-action text-white" : "border-ink bg-sheet text-ink",
                )}
              >
                {isDone ? "✓" : i + 1}
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

                <button
                  type="button"
                  aria-pressed={isDone}
                  onClick={() => toggle(i)}
                  className={cx(
                    // Like a box with its label: left-aligned, so a big text size wraps cleanly. Done is
                    // calm (pale green, the box ticked): the green ✓ circle already says it.
                    "mt-1 flex min-h-[3.25rem] w-full cursor-pointer items-center justify-start gap-2.5 border-[3px] px-3 py-2 text-left text-[1.05rem] font-bold sm:justify-center sm:gap-3 sm:px-4 print:hidden",
                    isDone ? "border-note-green bg-note-green text-ink hover:border-action" : "border-action bg-white text-action hover:text-action-hover",
                  )}
                >
                  <span
                    aria-hidden="true"
                    className={cx(
                      "grid size-[1.35rem] flex-none place-items-center border-2 border-action text-[0.95rem] leading-none",
                      isDone && "bg-action text-white",
                    )}
                  >
                    {isDone ? "✓" : ""}
                  </span>
                  Το έκανα σήμερα
                  <span className="sr-only">{`: ${exercise.name}`}</span>
                </button>

                {/* On paper: a week of boxes to tick with a pen. */}
                <div className="hidden print:block">
                  <ol aria-label="Οι μέρες της εβδομάδας" className="flex gap-1.5">
                    {DAYS.map((day) => (
                      <li key={day} className="flex flex-col items-center gap-0.5">
                        <span className="size-[1.7rem] border-2 border-ink" />
                        <span className="text-[0.85rem]">{day}</span>
                      </li>
                    ))}
                  </ol>
                </div>
              </div>
            </li>
          );
        })}
      </ol>

      <p className="text-muted print:hidden">Τα ✓ μένουν μόνο σε αυτή τη συσκευή. Κάθε νέα μέρα η λίστα ξεκινά από την αρχή.</p>
    </section>
  );
}
