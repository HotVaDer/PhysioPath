// A stored program, read-only, in plain words: its title, when it was approved, and each exercise with
// how much to do («3 σετ × 10 επαναλήψεις · 2 φορές τη μέρα»). Shown in «Νέα συνεδρία» step 2 (to decide
// «Ίδιο πρόγραμμα» or «Αλλαγή»), on the review page when the program stays the same, and for the template
// picked on the recording page (no approval date: a template isn't a patient's program).
import { doseLines } from "@/app/lib/notes/format";
import type { PatientProgram } from "@/app/lib/notes/schema";

const day = new Intl.DateTimeFormat("el-GR", { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Nicosia" });

export function ProgramSummary({ program, approvedAt, id }: { program: PatientProgram; approvedAt?: string; id?: string }) {
  return (
    <section aria-labelledby={id} className="flex flex-col gap-2 rounded-md border-2 border-hairline bg-white px-4 py-3.5 sm:px-5">
      <div className="flex flex-col">
        <h2 id={id} className="text-[19px] font-bold">
          {program.title.trim() || "Πρόγραμμα ασκήσεων"}
        </h2>
        {approvedAt && <p className="text-base text-muted">Εγκρίθηκε στις {day.format(new Date(approvedAt))}</p>}
      </div>
      <ol className="flex flex-col">
        {program.exercises.map((exercise, i) => {
          const dose = doseLines(exercise);
          return (
            <li key={i} className="flex flex-col border-t border-hairline py-2">
              <span className="font-semibold">
                {i + 1}. {exercise.name}
              </span>
              {dose.length > 0 && <span className="text-base">{dose.join(" · ")}</span>}
            </li>
          );
        })}
      </ol>
    </section>
  );
}
