"use client";
// The Review page: Claude's questions, today's exercises and the clinical note, all editable, then one
// "Έναρξη συνεδρίας" at the bottom. Nothing reaches the patient's screen until the physio starts it.
import { useRouter } from "next/navigation";
import { useState } from "react";

import { PageHeader } from "@/app/components/layout/PageHeader";
import { Alert } from "@/app/components/ui/Alert";
import { Button, ButtonLink } from "@/app/components/ui/Button";
import { Card } from "@/app/components/ui/Card";
import { CheckIcon, PlusIcon, UndoIcon } from "@/app/components/ui/icons";
import { ListField } from "@/app/components/ui/ListField";
import { TextField } from "@/app/components/ui/TextField";
import { useDraft } from "@/app/context/DraftContext";
import { ClinicalNoteEditor } from "@/app/features/review/ClinicalNoteEditor";
import { ExerciseEditor } from "@/app/features/review/ExerciseEditor";
import { startSessionRequest } from "@/app/lib/api";
import type { ProgramListField } from "@/app/lib/draft";
import { missingFields } from "@/app/lib/format";

const LISTS: [ProgramListField, string][] = [
  ["after_exercises", "Μετά τις ασκήσεις"],
  ["avoid", "Αποφύγετε"],
  ["contact_if", "Πάρτε μας τηλέφωνο αν"],
  ["other", "Άλλες οδηγίες"],
];

const fieldsMissing = (n: number) => (n === 1 ? "1 πεδίο λείπει" : `${n} πεδία λείπουν`);

export function ReviewScreen() {
  const { draft, dispatch, ready } = useDraft();
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const header = (
    <PageHeader step={1} title="Έλεγχος">
      Διορθώστε ό,τι χρειάζεται. Τίποτα δεν φτάνει στον ασθενή χωρίς την έγκρισή σας.
    </PageHeader>
  );

  if (!ready) return header; // the saved draft hasn't been read yet

  if (!draft.result) {
    return (
      <>
        {header}
        <Alert title="Δεν υπάρχει πρόγραμμα για έλεγχο">Ξεκινήστε από μια ηχογράφηση ή ένα δείγμα.</Alert>
        <ButtonLink href="/new" variant="primary" className="mt-6">
          Πίσω στην ηχογράφηση
        </ButtonLink>
      </>
    );
  }

  const { program, note, missing_or_unclear } = draft.result;
  const questions = missing_or_unclear.filter((q) => q.trim());
  // Sets and reps are what the patient's screen needs today; how often per day matters later, for the
  // home program, so a missing frequency is still marked "Λείπει" but doesn't hold up the start.
  const missing = missingFields(program).filter((m) => m.field !== "frequency");

  async function start(evenIfMissing: boolean) {
    if (!draft.result || starting) return;
    if (missing.length > 0 && !evenIfMissing) {
      setConfirming(true);
      return;
    }
    setStarting(true);
    setError(null);
    try {
      const { id } = await startSessionRequest(draft.result.program, draft.result.note);
      router.push(`/session/${id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Η συνεδρία δεν ξεκίνησε. Δοκιμάστε ξανά.");
      setStarting(false);
    }
  }

  function addExercise() {
    dispatch({ type: "addExercise" });
    const index = program.exercises.length;
    requestAnimationFrame(() => document.getElementById(`exercise-${index}-name`)?.focus());
  }

  return (
    <>
      {header}

      <div className="space-y-14">
        {questions.length > 0 && (
          <Alert tone="warning" title={questions.length === 1 ? "1 ερώτηση για εσάς" : `${questions.length} ερωτήσεις για εσάς`}>
            <ul className="mt-1 list-disc space-y-1 pl-5">
              {questions.map((question) => (
                <li key={question}>{question}</li>
              ))}
            </ul>
          </Alert>
        )}

        <Card tag="01" title="Πρόγραμμα ασθενή">
          <div className="grid gap-5 sm:grid-cols-2">
            <TextField label="Τίτλος" value={program.title} onChange={(e) => dispatch({ type: "setProgramText", field: "title", value: e.target.value })} />
            <TextField
              label="Όνομα ασθενή"
              value={program.patient_first_name ?? ""}
              onChange={(e) => dispatch({ type: "setProgramText", field: "patient_first_name", value: e.target.value })}
            />
          </div>

          <h3 className="label mt-12 mb-1 text-muted">Ασκήσεις</h3>
          <p className="mb-4 text-muted">Τα πεδία με «Λείπει» δεν αναφέρθηκαν στη σημείωση.</p>
          <ol>
            {program.exercises.map((exercise, index) => (
              <ExerciseEditor key={index} exercise={exercise} index={index} dispatch={dispatch} />
            ))}
          </ol>

          {draft.removed && (
            <Alert
              title={`Η άσκηση «${draft.removed.exercise.name || "χωρίς όνομα"}» αφαιρέθηκε`}
              className="my-4"
              action={
                <Button variant="ghost" icon={<UndoIcon />} onClick={() => dispatch({ type: "undoRemove" })}>
                  Αναίρεση
                </Button>
              }
            />
          )}

          <Button icon={<PlusIcon />} onClick={addExercise} className="mt-2">
            Προσθήκη άσκησης
          </Button>

          <h3 className="label mt-14 mb-4 text-muted">Οδηγίες</h3>
          <div className="grid gap-6 lg:grid-cols-2">
            {LISTS.map(([field, label]) => (
              <ListField key={field} label={label} value={program[field]} onChange={(items) => dispatch({ type: "setProgramList", field, items })} />
            ))}
          </div>
          <div className="mt-6 max-w-md">
            <TextField
              label="Επόμενο ραντεβού"
              value={program.next_appointment ?? ""}
              onChange={(e) => dispatch({ type: "setProgramText", field: "next_appointment", value: e.target.value })}
            />
          </div>
        </Card>

        <Card tag="02" title={draft.resultNoteLang === "en" ? "Κλινική σημείωση · English" : "Κλινική σημείωση"}>
          <p className="mb-6 text-muted">Μένει στο φυσιοθεραπευτήριο. Ο ασθενής δεν τη βλέπει ποτέ.</p>
          <ClinicalNoteEditor note={note} lang={draft.resultNoteLang} dispatch={dispatch} />
        </Card>
      </div>

      {/* Stays at the bottom of the screen while scrolling, so starting is always one step away. */}
      <div className="sticky bottom-0 z-10 -mx-4 mt-14 border-t border-border bg-background/95 px-4 py-4 backdrop-blur sm:-mx-6 sm:px-6">
        {confirming && missing.length > 0 && (
          <Alert
            tone="warning"
            title={fieldsMissing(missing.length)}
            className="mb-4"
            action={
              <div className="flex flex-wrap gap-3">
                <Button
                  onClick={() => {
                    setConfirming(false);
                    document.querySelector<HTMLElement>("[data-missing]")?.focus();
                  }}
                >
                  Συμπλήρωση
                </Button>
                <Button variant="primary" loading={starting} onClick={() => void start(true)}>
                  Έναρξη ούτως ή άλλως
                </Button>
              </div>
            }
          >
            Ο ασθενής θα δει μόνο ό,τι είναι συμπληρωμένο.
          </Alert>
        )}
        {error && (
          <Alert tone="danger" title="Η συνεδρία δεν ξεκίνησε" className="mb-4">
            {error}
          </Alert>
        )}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <p className="text-muted">
            Τίποτα δεν φτάνει στον ασθενή χωρίς την έγκρισή σας.
            {missing.length > 0 && <span className="font-semibold text-warning"> {fieldsMissing(missing.length)}.</span>}
          </p>
          {/* While asking about missing fields, the question's buttons are the only choices. */}
          {!(confirming && missing.length > 0) && (
            <Button variant="primary" size="xl" icon={<CheckIcon />} loading={starting} onClick={() => void start(false)}>
              Έναρξη συνεδρίας
            </Button>
          )}
        </div>
      </div>
    </>
  );
}
