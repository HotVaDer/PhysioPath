// One exercise on the review page: name, dose fields and notes. Fields the physio didn't say
// (sets, reps, how often) show "Λείπει". The remove button can be undone (see ReviewScreen).
import type { Dispatch } from "react";

import { Button } from "@/app/components/ui/Button";
import { TrashIcon } from "@/app/components/ui/icons";
import { TextArea } from "@/app/components/ui/TextArea";
import { TextField } from "@/app/components/ui/TextField";
import type { DraftAction } from "@/app/lib/draft";
import { isMissing } from "@/app/lib/format";
import type { Exercise } from "@/app/lib/schema";

type ExerciseEditorProps = { exercise: Exercise; index: number; dispatch: Dispatch<DraftAction> };

export function ExerciseEditor({ exercise, index, dispatch }: ExerciseEditorProps) {
  const number = index + 1;
  const set = (field: keyof Exercise) => (event: { target: { value: string } }) =>
    dispatch({ type: "setExercise", index, field, value: event.target.value });
  // data-missing lets "Συμπλήρωση" jump to the first empty field.
  const missingProps = (field: "sets" | "reps" | "frequency") => {
    const missing = isMissing(exercise, field);
    return { missing, "data-missing": missing || undefined };
  };

  return (
    <li className="border-t border-border py-8 first:border-t-0 first:pt-2">
      <div className="mb-4 flex items-center justify-between gap-4">
        <p className="label flex items-center gap-3 text-muted">
          <span className="flex size-8 items-center justify-center rounded-full border-2 border-primary font-bold text-foreground">{number}</span>
          Άσκηση {number}
        </p>
        <Button variant="ghost" icon={<TrashIcon />} onClick={() => dispatch({ type: "removeExercise", index })}>
          Αφαίρεση{" "}
          <span className="sr-only">άσκησης {number}</span>
        </Button>
      </div>

      <TextField id={`exercise-${index}-name`} label="Όνομα άσκησης" value={exercise.name} onChange={set("name")} />

      <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <TextField
          label="Σετ"
          inputMode="numeric"
          value={exercise.sets?.toString() ?? ""}
          onChange={(event) => dispatch({ type: "setExercise", index, field: "sets", value: event.target.value.replace(/\D/g, "") })}
          {...missingProps("sets")}
        />
        <TextField label="Επαναλήψεις" value={exercise.reps ?? ""} onChange={set("reps")} {...missingProps("reps")} />
        <TextField label="Κράτημα" value={exercise.hold ?? ""} onChange={set("hold")} />
        <TextField label="Πόσο συχνά" value={exercise.frequency ?? ""} onChange={set("frequency")} {...missingProps("frequency")} />
      </div>

      <div className="mt-5">
        <TextArea label="Σημειώσεις για τον ασθενή" value={exercise.notes ?? ""} onChange={set("notes")} className="min-h-20" />
      </div>
    </li>
  );
}
