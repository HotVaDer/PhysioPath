"use client";
// One template from «Πείτε τα πρότυπά σας», for the physio to check: the AI's questions about it, its name
// and area, the title the patient sees, the exercises (as on the review page of a voice note: one box per
// dose, «λείπει» in yellow) and the four lists of instructions. «Αποθήκευση» puts it in «Πρότυπα»;
// «Δεν το θέλω» drops it. Once saved, it folds to one line with a link to it in the library.
import Link from "next/link";
import type { Route } from "next";
import type { Dispatch } from "react";

import { LineField } from "@/app/components/paper/LineField";
import { FormAlert } from "@/app/components/paper/Notes";
import { cx } from "@/app/lib/cx";
import type { ProgramListField } from "@/app/lib/notes/draft";
import { isMissing } from "@/app/lib/notes/format";
import type { Exercise } from "@/app/lib/notes/schema";
import { CARD_ERRORS, nameTaken, type DictatedCard, type DictationAction } from "@/app/lib/templates/dictation";
import { greenButton } from "@/app/notes/LiveRecording";

const LISTS: { field: ProgramListField; label: string }[] = [
  { field: "after_exercises", label: "Μετά τις ασκήσεις" },
  { field: "avoid", label: "Αποφύγετε" },
  { field: "contact_if", label: "Πάρτε μας τηλέφωνο αν" },
  { field: "other", label: "Άλλες οδηγίες" },
];

const DOSES: { field: keyof Exercise; label: string; check?: "sets" | "reps" | "frequency"; numeric?: boolean }[] = [
  { field: "sets", label: "Σετ", check: "sets", numeric: true },
  { field: "reps", label: "Επαναλήψεις", check: "reps" },
  { field: "hold", label: "Κράτημα" },
  { field: "frequency", label: "Πόσο συχνά", check: "frequency" },
];

// A box to type in; yellow with «λείπει» when the physio didn't say it (as on the review page).
const box = (missing = false) =>
  cx(
    "min-h-[52px] w-full rounded-md px-3 text-lg text-ink",
    missing ? "border-[3px] border-ink bg-tab-yellow placeholder:text-ink" : "border-2 border-line bg-white placeholder:text-muted",
  );

const quiet = "min-h-11 cursor-pointer text-action underline underline-offset-[3px] hover:text-ink";

const exerciseCount = (n: number) => (n === 1 ? "1 άσκηση" : `${n} ασκήσεις`);

type Props = {
  card: DictatedCard;
  n: number; // its place on the page, «Πρότυπο 2»
  cards: DictatedCard[];
  library: ReadonlySet<string>;
  saving: boolean;
  dispatch: Dispatch<DictationAction>;
  onSave: () => void;
};

export function TemplateDraft({ card, n, cards, library, saving, dispatch, onSave }: Props) {
  const { key, program } = card;
  const id = `c-${key}`;
  const label = card.name.trim() || `Πρότυπο ${n}`;

  if (card.savedId) {
    return (
      <div role="status" className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-md border-2 border-action bg-note-green px-4 py-3">
        <span className="font-semibold">
          <span aria-hidden="true">✓</span> «{card.name.trim()}» αποθηκεύτηκε στα πρότυπα
        </span>
        <span className="text-muted">
          {card.area.trim() ? `${card.area.trim()} · ` : ""}
          {exerciseCount(program.exercises.filter((e) => e.name.trim()).length)}
        </span>
        <Link href={`/templates?open=${card.savedId}#t-${card.savedId}` as Route} className="ml-auto">
          Άνοιγμα
        </Link>
      </div>
    );
  }

  const taken = card.error === "taken" || nameTaken(card, library, cards);
  const nameError = card.error === "badname" ? CARD_ERRORS.badname : taken ? CARD_ERRORS.taken : undefined;
  const otherError = card.error && !["taken", "badname", "badarea"].includes(card.error) ? CARD_ERRORS[card.error] : null;

  return (
    <article aria-labelledby={`${id}-h`} className="flex flex-col gap-4 rounded-md border-2 border-line bg-white px-4 pb-5 pt-4 sm:px-5">
      <h3 id={`${id}-h`} className="text-[21px] font-bold">
        <span className="text-muted">Πρότυπο {n} · </span>
        {label}
      </h3>

      {card.questions.length > 0 && (
        <div className="self-start bg-tab-yellow px-4 py-3">
          <h4 className="font-semibold">Να ελέγξετε</h4>
          <ul className="list-disc pl-6">
            {card.questions.map((q, i) => (
              <li key={i}>{q}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="grid gap-x-6 gap-y-4 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <LineField
          id={`${id}-name`}
          label="Όνομα του προτύπου"
          width="max-w-none"
          maxLength={80}
          value={card.name}
          error={nameError}
          onChange={(e) => dispatch({ type: "setText", key, field: "name", value: e.target.value })}
        />
        <LineField
          id={`${id}-area`}
          label="Περιοχή"
          width="max-w-none"
          maxLength={60}
          value={card.area}
          error={card.error === "badarea" ? CARD_ERRORS.badarea : undefined}
          onChange={(e) => dispatch({ type: "setText", key, field: "area", value: e.target.value })}
        />
      </div>
      <LineField
        id={`${id}-title`}
        label="Τίτλος για τον ασθενή"
        width="max-w-none"
        value={program.title}
        onChange={(e) => dispatch({ type: "setText", key, field: "title", value: e.target.value })}
      />

      <h4 id={`${id}-ex`} className="pt-1 text-[19px] font-semibold">
        Ασκήσεις
      </h4>
      <ol aria-labelledby={`${id}-ex`} className="flex flex-col gap-3.5">
        {program.exercises.map((exercise, i) => {
          const name = exercise.name.trim() || `άσκηση ${i + 1}`;
          const ex = `${id}-ex-${i}`;
          return (
            <li key={i} className="flex flex-col gap-3 rounded-md border-2 border-hairline px-4 pb-4 pt-3">
              <div className="flex flex-wrap items-end gap-x-4 gap-y-2">
                <div className="flex min-w-0 flex-[1_1_260px] flex-col gap-1">
                  <label htmlFor={`${ex}-name`} className="font-semibold">
                    Άσκηση {i + 1}
                    <span className="sr-only">, {label}</span>
                  </label>
                  <input
                    id={`${ex}-name`}
                    type="text"
                    value={exercise.name}
                    onChange={(e) => dispatch({ type: "setExercise", key, index: i, field: "name", value: e.target.value })}
                    className={box()}
                  />
                </div>
                <button type="button" onClick={() => dispatch({ type: "removeExercise", key, index: i })} className={cx(quiet, "min-h-[52px] px-1")}>
                  Αφαίρεση<span className="sr-only">: {name}</span>
                </button>
              </div>
              <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                {DOSES.map((d) => {
                  const missing = d.check ? isMissing(exercise, d.check) : false;
                  const value = exercise[d.field];
                  return (
                    <div key={d.field} className="flex min-w-0 flex-col gap-1">
                      <label htmlFor={`${ex}-${d.field}`} className="text-base">
                        {d.label}
                        <span className="sr-only">, {name}</span>
                      </label>
                      <input
                        id={`${ex}-${d.field}`}
                        type="text"
                        inputMode={d.numeric ? "numeric" : undefined}
                        placeholder={missing ? "λείπει" : "—"}
                        aria-description={missing ? "λείπει" : undefined}
                        value={value == null ? "" : String(value)}
                        onChange={(e) => dispatch({ type: "setExercise", key, index: i, field: d.field, value: e.target.value })}
                        className={box(missing)}
                      />
                    </div>
                  );
                })}
              </div>
              <div className="flex flex-col gap-1">
                <label htmlFor={`${ex}-notes`} className="text-base">
                  Σημείωση για τον ασθενή <span className="text-muted">(αν θέλετε)</span>
                  <span className="sr-only">, {name}</span>
                </label>
                <input
                  id={`${ex}-notes`}
                  type="text"
                  value={exercise.notes ?? ""}
                  onChange={(e) => dispatch({ type: "setExercise", key, index: i, field: "notes", value: e.target.value })}
                  className={box()}
                />
              </div>
            </li>
          );
        })}
      </ol>
      <button
        type="button"
        onClick={() => dispatch({ type: "addExercise", key })}
        className="min-h-[52px] cursor-pointer self-start border-2 border-action bg-white px-5 font-bold text-action hover:bg-note-green"
      >
        <span aria-hidden="true">+</span> Προσθήκη άσκησης<span className="sr-only">, {label}</span>
      </button>

      <div className="grid gap-x-6 gap-y-4 md:grid-cols-2">
        {LISTS.map(({ field, label: listLabel }) => (
          <div key={field} className="flex min-w-0 flex-col gap-1">
            <label htmlFor={`${id}-${field}`} className="font-semibold">
              {listLabel}
              <span className="sr-only">, {label}</span>
            </label>
            <textarea
              id={`${id}-${field}`}
              rows={2}
              placeholder="Δεν αναφέρθηκε · μία γραμμή για το καθένα"
              value={program[field].join("\n")}
              onChange={(e) => dispatch({ type: "setList", key, field, items: e.target.value.split("\n") })}
              className={cx(box(), "resize-y py-2.5 leading-relaxed")}
            />
          </div>
        ))}
      </div>

      {otherError && <FormAlert>{otherError}</FormAlert>}
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 border-t-2 border-hairline pt-4">
        <button type="button" onClick={onSave} disabled={saving} className={greenButton}>
          {saving ? "Αποθήκευση…" : "Αποθήκευση"}
          <span className="sr-only">: {label}</span>
        </button>
        <button type="button" onClick={() => dispatch({ type: "dropCard", key })} disabled={saving} className={quiet}>
          Δεν το θέλω<span className="sr-only">: {label}</span>
        </button>
      </div>
    </article>
  );
}
