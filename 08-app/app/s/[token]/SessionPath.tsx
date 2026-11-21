"use client";
// Where the patient is in the session, drawn as the same path as the home program's exercises (the
// «Path» in PhysioPath): one circle per exercise, joined by a line that turns green behind each one
// done, the one now a bigger ring. Beside it «Όλες» (οι ασκήσεις) opens the path as a list, like on the
// home program (numbered circles, ✓ when done, and how far each one got), and tapping an exercise goes
// to it (SessionScreen tells the board: 'show').
// The small path is decoration (the words say the same); with many exercises its circles get smaller.
import { Fragment } from "react";

import { ListIcon } from "@/app/components/patient/icons";
import { isDone, type PatientView } from "@/app/lib/board/session";
import { cx } from "@/app/lib/cx";

type Props = {
  view: PatientView;
  shown: number; // the exercise on screen, -1 when everything is done
  open: boolean;
  onToggle: () => void;
  onGoTo: (exercise: number) => void;
};

export function SessionPath({ view, shown, open, onToggle, onGoTo }: Props) {
  const exercises = view.program.exercises;
  const total = exercises.length;

  return (
    <nav aria-label="Οι ασκήσεις της συνεδρίας" className="flex flex-col gap-2">
      <div className="flex items-center gap-4">
        {/* The path at a glance. */}
        <div aria-hidden="true" className="flex min-w-0 flex-1 items-center">
          {exercises.map((_, i) => (
            <Fragment key={i}>
              {i > 0 && <span className={cx("h-[3px] min-w-[3px] flex-1", isDone(view, i - 1) ? "bg-action" : "bg-hairline")} />}
              <span
                className={cx(
                  "aspect-square min-w-[7px] shrink rounded-full",
                  i === shown
                    ? "w-[1.35rem] border-[3px] border-ink bg-white"
                    : isDone(view, i)
                      ? "w-[0.95rem] bg-action"
                      : "w-[0.95rem] border-2 border-line bg-sheet",
                )}
              />
            </Fragment>
          ))}
        </div>
        {total > 1 && (
          <button
            type="button"
            aria-expanded={open}
            aria-controls={open ? "all-exercises" : undefined}
            onClick={onToggle}
            className={cx(
              "flex min-h-[3rem] flex-none cursor-pointer items-center gap-2 border-2 px-3 font-bold",
              open ? "border-ink bg-white text-ink" : "border-line bg-sheet text-ink hover:border-ink",
            )}
          >
            <ListIcon className="size-[1.2rem]" />
            {open ? (
              "Κλείσιμο"
            ) : (
              <span>
                Όλες <span className="sr-only">οι ασκήσεις</span>
              </span>
            )}
          </button>
        )}
      </div>

      {open && (
        <ol id="all-exercises" aria-label="Όλες οι ασκήσεις" className="mt-1 border-t-2 border-hairline pt-2">
          {exercises.map((exercise, i) => {
            const done = isDone(view, i);
            const now = i === shown;
            const setsDone = view.setsDone[i];
            const setsTarget = view.setsTarget[i];
            const state = done ? "Έγινε" : now ? "Τώρα" : setsDone > 0 ? `Σετ ${setsDone} από ${setsTarget} έγιναν` : null;
            return (
              <li key={i} className="relative">
                {/* The path on to the next exercise: green once this one is done. */}
                {i < total - 1 && (
                  <span
                    aria-hidden="true"
                    className={cx("absolute top-[2.85rem] -bottom-[0.75rem] left-[1.05rem] w-[3px] -translate-x-1/2", done ? "bg-action" : "bg-hairline")}
                  />
                )}
                <button
                  type="button"
                  onClick={() => onGoTo(i)}
                  aria-current={now ? "step" : undefined}
                  className="relative grid min-h-[3.5rem] w-full cursor-pointer grid-cols-[2.1rem_minmax(0,1fr)] items-start gap-x-3 py-[0.75rem] text-left hover:bg-note-green"
                >
                  <span
                    aria-hidden="true"
                    className={cx(
                      "grid size-[2.1rem] place-items-center rounded-full border-[3px] font-display text-[1.05rem] leading-none",
                      done ? "border-action bg-action text-white" : now ? "border-ink bg-ink text-white" : "border-ink bg-sheet text-ink",
                    )}
                  >
                    {done ? "✓" : i + 1}
                  </span>
                  <span className="flex min-w-0 flex-col pt-[0.2rem]">
                    <span className={cx("leading-snug text-pretty", now && "font-bold")}>
                      <span className="sr-only">{`Άσκηση ${i + 1}:`}</span> {exercise.name}
                    </span>
                    {state && <span className={cx(now && !done ? "font-bold text-ink" : "text-muted")}>{state}</span>}
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
      )}
    </nav>
  );
}
