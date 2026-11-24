// The exercises on the clinic's printed sheet (/programs/[id]/print), for a patient who doesn't use a phone:
// numbered, with how much to do in full words and the physio's notes, and two weeks of day boxes under each
// one to tick with a pen. No buttons and no diary: nothing here saves anything. The phone page has its own
// list (ExerciseChecklist), which prints one week.
import { cx } from "@/app/lib/cx";
import type { ChecklistExercise } from "@/app/p/[token]/ExerciseChecklist";

const DAYS = ["Δευ", "Τρί", "Τετ", "Πέμ", "Παρ", "Σάβ", "Κυρ"];
export const PAPER_WEEKS = 2;
const WEEK_NAMES = ["1η εβδομάδα", "2η εβδομάδα", "3η εβδομάδα", "4η εβδομάδα"];

type Props = {
  exercises: Pick<ChecklistExercise, "name" | "dose" | "notes">[];
  // Two columns of exercises: when nothing else sits beside the list (no instructions), at normal size.
  twoColumns?: boolean;
};

export function PaperExercises({ exercises, twoColumns = false }: Props) {
  return (
    <section aria-labelledby="exercises-title" className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h2 id="exercises-title" className="font-display text-[1.5rem] leading-tight">
          Οι ασκήσεις
        </h2>
        <p>Σημειώστε ✓ στο κουτάκι της ημέρας, κάθε μέρα που κάνετε την άσκηση.</p>
      </div>

      <ol className={cx("flex flex-col", twoColumns && "block columns-2 gap-10")}>
        {exercises.map((exercise, i) => (
          <li key={i} className="mb-6 grid break-inside-avoid grid-cols-[2.1rem_minmax(0,1fr)] gap-x-3 last:mb-1 sm:grid-cols-[2.4rem_minmax(0,1fr)] sm:gap-x-4">
            <span
              aria-hidden="true"
              className="grid size-[2.1rem] place-items-center rounded-full border-[3px] border-ink font-display text-[1.05rem] leading-none sm:size-[2.4rem] sm:text-[1.15rem]"
            >
              {i + 1}
            </span>
            <div className="flex min-w-0 flex-col gap-2 pt-[0.15rem] sm:pt-[0.3rem]">
              <h3 className="font-display text-[1.25rem] leading-snug text-pretty">
                <span className="sr-only">{`Άσκηση ${i + 1}:`}</span> {exercise.name}
              </h3>
              {exercise.dose.length > 0 && (
                <ul className="flex flex-col gap-0.5 text-[1.05rem]">
                  {exercise.dose.map((line, j) => (
                    <li key={j} className={cx(j === 0 && "font-bold")}>
                      {line}
                    </li>
                  ))}
                </ul>
              )}
              {exercise.notes && <p>{exercise.notes}</p>}
              <div className="flex flex-col gap-1.5 pt-1">
                {WEEK_NAMES.slice(0, PAPER_WEEKS).map((week) => (
                  <div key={week} className="flex flex-wrap items-end gap-x-3 gap-y-1">
                    <span className="w-[6.5rem] pb-[1.3rem] text-[0.9rem] text-muted">{week}</span>
                    <ol aria-label={`${week}: οι μέρες`} className="flex gap-1.5">
                      {DAYS.map((day) => (
                        <li key={day} className="flex flex-col items-center gap-0.5">
                          <span className="size-[1.7rem] border-2 border-ink bg-white" />
                          <span className="text-[0.85rem]">{day}</span>
                        </li>
                      ))}
                    </ol>
                  </div>
                ))}
              </div>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
