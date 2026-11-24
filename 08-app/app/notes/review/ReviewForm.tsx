"use client";
// «Νέα συνεδρία», step 4 of 4: check and approve. With «Ίδιο πρόγραμμα» the program is shown read-only
// (it stays as stored) and only today's GeSY note and the place are checked. The patient's program, the GeSY note, where the patient
// exercises now, then «Έγκριση». Every edit goes into the draft (sessionStorage). «Έγκριση» sends the
// draft to approveNote() (a server action), which checks it all again and saves it in one go.
// Plain look (2026-11-17): plain titles instead of «Ι. ΙΙ. ΙΙΙ.», one card per exercise instead of a
// table wider than a phone, boxed fields with the label above, flat boxes instead of tilted slips,
// «Εγκρίνετε ως …» instead of a signature line.
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useRef, useState, type FormEvent } from "react";

import { SubmitButton } from "@/app/components/paper/Buttons";
import { LineField, LineSelect } from "@/app/components/paper/LineField";
import { FormAlert } from "@/app/components/paper/Notes";
import { Panel, PanelTitle, PartTitle } from "@/app/components/paper/StaffSheet";
import { cx } from "@/app/lib/cx";
import { approveNote, type ApproveState } from "@/app/lib/notes/actions";
import { approvalErrors, OTHER_CLINIC_NOTE, type ApprovalErrors, type SlotOption } from "@/app/lib/notes/approval";
import { isStale, type ProgramListField } from "@/app/lib/notes/draft";
import { useDraft } from "@/app/lib/notes/DraftContext";
import { GESY_LABELS, isMissing } from "@/app/lib/notes/format";
import { ACTIVITY_CODES, GESY_PARTS, type ActivityCode, type Exercise } from "@/app/lib/notes/schema";
import { ProgramSummary } from "@/app/notes/ProgramSummary";
import { StaleNotice } from "@/app/notes/StaleNotice";

// clinicId: the clinic open now. The draft remembers the one it was started in (Draft.clinicId).
type Props = { slots: SlotOption[]; notesPerPatient: Record<string, number>; signer: string; today: string; clinicId: string };

const LISTS: { field: ProgramListField; label: string }[] = [
  { field: "avoid", label: "Αποφύγετε" },
  { field: "contact_if", label: "Πάρτε μας τηλέφωνο αν" },
  { field: "other", label: "Άλλες οδηγίες" },
  { field: "after_exercises", label: "Μετά τις ασκήσεις" },
];

const COLUMNS: { field: keyof Exercise; label: string; check?: "sets" | "reps" | "frequency"; numeric?: boolean }[] = [
  { field: "sets", label: "Σετ", check: "sets", numeric: true },
  { field: "reps", label: "Επαναλήψεις", check: "reps" },
  { field: "hold", label: "Κράτημα" },
  { field: "frequency", label: "Πόσο συχνά", check: "frequency" },
];

// A box to type in; yellow with «λείπει» when the note didn't say it.
const box = (missing = false) =>
  cx(
    "min-h-[52px] w-full rounded-md px-3 text-lg text-ink",
    missing ? "border-[3px] border-ink bg-tab-yellow placeholder:text-ink" : "border-2 border-line bg-white placeholder:text-muted",
  );
const area = (missing = false) => cx(box(missing), "resize-y py-2.5 leading-relaxed");

// One choice as a big box with its radio inside.
const choice =
  "flex min-h-[52px] cursor-pointer items-center gap-3 rounded-md border-2 border-line bg-white px-4 py-2 has-[:checked]:border-[3px] has-[:checked]:border-action has-[:checked]:bg-note-green";
const radio = "size-[22px] flex-none cursor-pointer accent-action";

export function ReviewForm({ slots, notesPerPatient, signer, today, clinicId }: Props) {
  const router = useRouter();
  const { draft, dispatch, ready } = useDraft();
  const [state, action] = useActionState<ApproveState, FormData>(approveNote, {});
  const [local, setLocal] = useState<ApprovalErrors>({});
  const formRef = useRef<HTMLFormElement>(null);

  // Someone took the bed a moment ago: reload the free slots and ask again.
  useEffect(() => {
    if (!state.slotTaken) return;
    dispatch({ type: "setWhere", where: null });
    router.refresh();
  }, [state.at, state.slotTaken, dispatch, router]);

  if (!ready) return <p className="text-muted">Φόρτωση…</p>;
  const result = draft.result;
  if (!result) {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="font-display text-[34px] leading-tight sm:text-[40px]">Δεν υπάρχει πρόγραμμα για έλεγχο</h1>
        <p>Ξεκινήστε από μια νέα συνεδρία. Αν μόλις εγκρίνατε, θα το βρείτε στην αίθουσα.</p>
        <Link href="/notes/new" className="self-start">
          Νέα συνεδρία
        </Link>
      </div>
    );
  }

  const { program, note } = result;
  const lang = draft.resultNoteLang;
  const errors = { ...local, ...state.errors };
  const patient = draft.patient ?? { id: null, label: "" };
  const sessionNo = patient.id ? (notesPerPatient[patient.id] ?? 0) + 1 : 1;
  const free = slots.filter((s) => s.free);
  const taken = slots.filter((s) => !s.free);
  const chosen = slots.find((s) => s.value === draft.where);
  const questions = result.missing_or_unclear;
  const same = draft.mode === "same" && draft.base !== null;
  const needsAssessment = (draft.activityCode === "PHYS01" || draft.activityCode === "PHYS03") && !note.assessment_findings?.trim();
  // Started in another clinic: its patient and beds aren't this one's (approveNote refuses it too).
  const otherClinic = draft.clinicId !== null && draft.clinicId !== clinicId;
  // The text changed after this was made: «Έγκριση» waits until the physio makes a new one or keeps this.
  const stale = isStale(draft);

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    if (stale) {
      event.preventDefault();
      requestAnimationFrame(() => document.getElementById("stale")?.scrollIntoView({ block: "center" }));
      return;
    }
    const found = approvalErrors({ patient, program, activityCode: draft.activityCode, where: draft.where });
    setLocal(found);
    if (Object.keys(found).length > 0) {
      event.preventDefault();
      const first = Object.keys(found)[0];
      requestAnimationFrame(() => {
        const target = document.getElementById(`f-${first}`);
        target?.scrollIntoView({ block: "center" });
        target?.focus();
      });
    }
  }

  const payload = JSON.stringify({
    draftId: draft.draftId,
    patient,
    program,
    note,
    noteLang: lang,
    activityCode: draft.activityCode,
    where: draft.where,
    mode: same ? "same" : "new",
    baseProgramId: same ? draft.base!.programId : null,
    templateId: same ? null : (draft.template?.id ?? null),
    clinicId: draft.clinicId ?? clinicId, // not stamped yet (the first moment): it was started here
  });

  return (
    <div className="flex flex-col gap-8">
      {otherClinic && <FormAlert>{OTHER_CLINIC_NOTE}</FormAlert>}
      {stale && (
        <div id="stale">
          <StaleNotice same={same} onKeep={() => dispatch({ type: "keepResult" })} />
        </div>
      )}
      <div className="flex flex-col gap-2">
        <Link href="/notes/record" className="min-h-11 content-center self-start">
          <span aria-hidden="true">←</span> Πίσω στην ηχογράφηση
        </Link>
        <h1 className="font-display text-[34px] leading-tight sm:text-[40px]">Έλεγχος και έγκριση</h1>
        <p className="text-[19px]">
          <strong>{patient.label.trim() || "Ασθενής χωρίς όνομα"}</strong>
          {note.body_area?.trim() ? ` · ${note.body_area.trim()}` : ""} · {today}
        </p>
        <p className="max-w-[62ch] text-muted">Γράψαμε μόνο ό,τι είπατε. Ό,τι λείπει το αφήσαμε κενό (κίτρινο) και σας ρωτάμε.</p>
      </div>

      {questions.length > 0 && (
        <Panel tint="yellow" labelledBy="q-h">
          <PanelTitle id="q-h">{questions.length === 1 ? "1 ερώτηση για εσάς" : `${questions.length} ερωτήσεις για εσάς`}</PanelTitle>
          <ol className="flex list-decimal flex-col gap-1 pl-6">
            {questions.map((q, i) => (
              <li key={i}>{q}</li>
            ))}
          </ol>
        </Panel>
      )}

      {/* The patient's program: read-only when it stays the same */}
      {same ? (
        <section aria-labelledby="p-h" className="flex flex-col gap-3 border-t-2 border-hairline pt-5">
          <PartTitle id="p-h" note="Μένει ίδιο. Ο ασθενής ανοίγει αυτό το πρόγραμμα στο κινητό του, όπως πριν.">
            Το πρόγραμμα του ασθενή: ίδιο
          </PartTitle>
          <ProgramSummary program={draft.base!.program} approvedAt={draft.base!.approvedAt} />
          {patient.id && (
            <Link href={`/notes/program?patient=${patient.id}`} className="min-h-11 content-center self-start">
              Αλλαγή προγράμματος
            </Link>
          )}
        </section>
      ) : (
        <>
          {/* The patient's program */}
          <section aria-labelledby="p-h" className="flex flex-col gap-4 border-t-2 border-hairline pt-5">
            <PartTitle
              id="p-h"
              note={
                draft.template
                  ? draft.template.asIs
                    ? `Το πρότυπο «${draft.template.name}» όπως είναι. Αλλάξτε εδώ ό,τι χρειάζεται. Αυτό βλέπει ο ασθενής στο κινητό του.`
                    : `Από το πρότυπο «${draft.template.name}», με τις αλλαγές που είπατε. Αυτό βλέπει ο ασθενής στο κινητό του.`
                  : "Αυτό βλέπει ο ασθενής στο κινητό του, με απλά λόγια."
              }
            >
              Το πρόγραμμα του ασθενή
            </PartTitle>

            <div className="grid gap-x-6 gap-y-4 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
              <LineField
                id="p-title"
                label="Τίτλος"
                width="max-w-none"
                value={program.title}
                onChange={(e) => dispatch({ type: "setProgramText", field: "title", value: e.target.value })}
              />
              <LineField
                id="p-name"
                label="Για"
                width="max-w-none"
                value={program.patient_first_name ?? ""}
                onChange={(e) => dispatch({ type: "setProgramText", field: "patient_first_name", value: e.target.value })}
              />
            </div>

            <h3 id="ex-h" className="pt-1 text-[19px] font-semibold">
              Ασκήσεις
            </h3>
            <ol aria-labelledby="ex-h" aria-describedby={errors.exercises ? "f-exercises-error" : undefined} className="flex flex-col gap-3.5">
              {program.exercises.map((exercise, i) => {
                const n = i + 1;
                const name = exercise.name.trim() || `άσκηση ${n}`;
                const id = `ex-${i}`;
                return (
                  <li key={i} className="flex flex-col gap-3 rounded-md border-2 border-hairline px-4 pb-4 pt-3 sm:px-5">
                    <div className="flex flex-wrap items-end gap-x-4 gap-y-2">
                      <div className="flex min-w-0 flex-[1_1_260px] flex-col gap-1">
                        <label htmlFor={i === 0 ? "f-exercises" : `${id}-name`} className="font-semibold">
                          Άσκηση {n}
                        </label>
                        <input
                          id={i === 0 ? "f-exercises" : `${id}-name`}
                          type="text"
                          value={exercise.name}
                          onChange={(e) => dispatch({ type: "setExercise", index: i, field: "name", value: e.target.value })}
                          className={box()}
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => dispatch({ type: "removeExercise", index: i })}
                        className="min-h-[52px] cursor-pointer px-1 text-action underline underline-offset-[3px] hover:text-ink"
                      >
                        Αφαίρεση<span className="sr-only">: {name}</span>
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                      {COLUMNS.map((c) => {
                        const missing = c.check ? isMissing(exercise, c.check) : false;
                        const value = exercise[c.field];
                        return (
                          <div key={c.field} className="flex min-w-0 flex-col gap-1">
                            <label htmlFor={`${id}-${c.field}`} className="text-base">
                              {c.label}
                              <span className="sr-only">, {name}</span>
                            </label>
                            <input
                              id={`${id}-${c.field}`}
                              type="text"
                              inputMode={c.numeric ? "numeric" : undefined}
                              placeholder={missing ? "λείπει" : "—"}
                              aria-description={missing ? "λείπει" : undefined}
                              value={value == null ? "" : String(value)}
                              onChange={(e) => dispatch({ type: "setExercise", index: i, field: c.field, value: e.target.value })}
                              className={box(missing)}
                            />
                          </div>
                        );
                      })}
                    </div>
                    <div className="flex flex-col gap-1">
                      <label htmlFor={`${id}-notes`} className="text-base">
                        Σημείωση για τον ασθενή <span className="text-muted">(αν θέλετε)</span>
                        <span className="sr-only">, {name}</span>
                      </label>
                      <input
                        id={`${id}-notes`}
                        type="text"
                        value={exercise.notes ?? ""}
                        onChange={(e) => dispatch({ type: "setExercise", index: i, field: "notes", value: e.target.value })}
                        className={box()}
                      />
                    </div>
                  </li>
                );
              })}
            </ol>
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
              <button
                type="button"
                onClick={() => dispatch({ type: "addExercise" })}
                className="min-h-[52px] cursor-pointer self-start border-2 border-action bg-white px-5 font-bold text-action hover:bg-note-green"
              >
                <span aria-hidden="true">+</span> Προσθήκη άσκησης
              </button>
              {draft.removed && (
                <p role="status" className="flex flex-wrap items-center gap-x-3">
                  Αφαιρέθηκε: «{draft.removed.exercise.name || "άσκηση χωρίς όνομα"}».
                  <button type="button" onClick={() => dispatch({ type: "undoRemove" })} className="min-h-11 cursor-pointer text-action underline underline-offset-[3px] hover:text-ink">
                    Αναίρεση
                  </button>
                </p>
              )}
            </div>
            {errors.exercises && (
              <p id="f-exercises-error" className="font-semibold text-error">
                Πρόβλημα: {errors.exercises}
              </p>
            )}

            <div className="grid gap-x-6 gap-y-4 md:grid-cols-2">
              {LISTS.map(({ field, label }) => (
                <div key={field} className="flex min-w-0 flex-col gap-1">
                  <label htmlFor={`l-${field}`} className="font-semibold">
                    {label}
                  </label>
                  <p id={`l-${field}-hint`} className="text-base text-muted">
                    Μία γραμμή για το καθένα.
                  </p>
                  <textarea
                    id={`l-${field}`}
                    rows={3}
                    placeholder="Δεν αναφέρθηκε"
                    aria-describedby={`l-${field}-hint`}
                    value={program[field].join("\n")}
                    onChange={(e) => dispatch({ type: "setProgramList", field, items: e.target.value.split("\n") })}
                    className={area()}
                  />
                </div>
              ))}
            </div>
            <LineField
              id="p-next"
              label="Επόμενο ραντεβού"
              width="max-w-[320px]"
              value={program.next_appointment ?? ""}
              onChange={(e) => dispatch({ type: "setProgramText", field: "next_appointment", value: e.target.value })}
            />
          </section>
        </>
      )}

      {/* The clinical note (GeSY) */}
      <section aria-labelledby="n-h" className="flex flex-col gap-4 border-t-2 border-hairline pt-5">
        <PartTitle id="n-h" note="Μένει στην κλινική. Ο ασθενής και οι βοηθοί δεν τη βλέπουν ποτέ.">
          Η κλινική σημείωση για το ΓεΣΥ{lang === "en" ? " (English)" : ""}
        </PartTitle>

        <div className="grid gap-x-6 gap-y-4 md:grid-cols-[minmax(0,1.4fr)_minmax(0,0.6fr)_minmax(0,1fr)]">
          <LineSelect
            id="f-activityCode"
            label="Κωδικός πράξης"
            hint="Τον διαλέγετε εσείς, δεν τον μαντεύουμε."
            width="max-w-none"
            value={draft.activityCode ?? ""}
            error={errors.activityCode}
            onChange={(e) => dispatch({ type: "setActivityCode", code: (e.target.value || null) as ActivityCode | null })}
          >
            <option value="">Διαλέξτε…</option>
            {(Object.keys(ACTIVITY_CODES) as ActivityCode[]).map((code) => (
              <option key={code} value={code}>
                {code} · {ACTIVITY_CODES[code]}
              </option>
            ))}
          </LineSelect>
          <div className="flex flex-col gap-1">
            <span className="text-[19px] font-semibold">Συνεδρία</span>
            <span className="text-base text-muted">{patient.id ? "Από το ιστορικό του." : "Πρώτη για νέο ασθενή."}</span>
            <span className="flex min-h-[52px] items-center text-[26px] font-bold">{sessionNo}η</span>
          </div>
          <LineField
            id="n-area"
            label="Περιοχή"
            width="max-w-none"
            value={note.body_area ?? ""}
            onChange={(e) => dispatch({ type: "setNote", field: "body_area", value: e.target.value })}
          />
        </div>

        {GESY_PARTS.map((part, i) => {
          const missing = !note[part]?.trim();
          const id = `n-${part}`;
          return (
            <div key={part} className="flex flex-col gap-1">
              <label htmlFor={id} className="font-semibold">
                {i + 1}. {GESY_LABELS[lang][part]}
                {missing && <span className="font-normal"> · λείπει</span>}
              </label>
              {missing && (
                <p id={`${id}-hint`} className="text-base text-muted">
                  Δεν το συμπληρώνουμε εμείς. Γράψτε το ή αφήστε το κενό.
                  {part === "assessment_findings" && needsAssessment ? ` Με ${draft.activityCode} ο ΓεΣΥ ζητά αποτελέσματα αξιολόγησης.` : ""}
                </p>
              )}
              <textarea
                id={id}
                rows={2}
                lang={lang}
                placeholder={lang === "el" ? "Δεν αναφέρθηκε" : "Not mentioned"}
                value={note[part] ?? ""}
                aria-describedby={missing ? `${id}-hint` : undefined}
                onChange={(e) => dispatch({ type: "setNote", field: part, value: e.target.value })}
                className={area(missing)}
              />
            </div>
          );
        })}
      </section>

      {/* Where the patient exercises now */}
      <section aria-labelledby="w-h" className="flex flex-col gap-3 border-t-2 border-hairline pt-5">
        <PartTitle id="w-h" note="Ο ασθενής ανοίγει το πρόγραμμα στο κινητό του, κι εμφανίζεται στην αίθουσα σε αυτή τη θέση.">
          Πού κάνει τις ασκήσεις τώρα;
        </PartTitle>
        <fieldset aria-describedby={errors.where ? "f-where-error" : undefined} className="flex flex-col gap-2.5">
          <legend className="sr-only">Θέση στην αίθουσα</legend>
          {free.length > 0 && (
            <div className="grid gap-2.5 sm:grid-cols-[repeat(auto-fill,minmax(240px,1fr))]">
              {free.map((s, i) => (
                <label key={s.value} className={choice}>
                  <input
                    id={i === 0 ? "f-where" : undefined}
                    type="radio"
                    name="where"
                    checked={draft.where === s.value}
                    onChange={() => dispatch({ type: "setWhere", where: s.value })}
                    className={radio}
                  />
                  {s.room} · {s.label}
                </label>
              ))}
            </div>
          )}
          <label className={cx(choice, "sm:max-w-[480px]")}>
            <input
              id={free.length === 0 ? "f-where" : undefined}
              type="radio"
              name="where"
              checked={draft.where === "home"}
              onChange={() => dispatch({ type: "setWhere", where: "home" })}
              className={radio}
            />
            <span className="flex flex-col">
              <span>Μόνο για το σπίτι</span>
              <span className="text-base text-muted">Δεν ασκείται τώρα στην κλινική.</span>
            </span>
          </label>
        </fieldset>
        {taken.length > 0 && (
          <p className="text-base">
            <span className="text-muted">Πιασμένες τώρα:</span> {taken.map((s) => `${s.room} · ${s.label} (${s.takenBy})`).join(", ")}
          </p>
        )}
        {free.length === 0 && slots.length > 0 && <p>Όλες οι θέσεις είναι πιασμένες αυτή τη στιγμή.</p>}
        {errors.where && (
          <p id="f-where-error" className="font-semibold text-error">
            Πρόβλημα: {errors.where}
          </p>
        )}
      </section>

      {/* Approve */}
      <form ref={formRef} action={action} onSubmit={onSubmit} noValidate className="flex flex-col gap-4 border-t-2 border-hairline pt-5">
        <input type="hidden" name="payload" value={payload} />
        <PartTitle>Έγκριση</PartTitle>
        {errors.patient && (
          <p id="f-patient" tabIndex={-1} className="font-semibold text-error">
            Πρόβλημα: {errors.patient} <Link href="/notes/new">Διαλέξτε ασθενή</Link>
          </p>
        )}
        <p className="text-[19px]">
          Εγκρίνετε ως <strong>{signer}</strong>, {today}.
        </p>
        <p className="max-w-[64ch] text-muted">
          {questions.length > 0
            ? `${questions.length === 1 ? "Υπάρχει 1 ανοιχτή ερώτηση" : `Υπάρχουν ${questions.length} ανοιχτές ερωτήσεις`}. Μπορείτε να εγκρίνετε και έτσι: τα κενά μένουν κενά. `
            : ""}
          Μετά την έγκριση δεν αλλάζει τίποτα. Για αλλαγές στο πρόγραμμα: «Νέα συνεδρία» → «Αλλαγή προγράμματος».
        </p>
        <FormAlert>{state.message}</FormAlert>
        {stale && <p className="font-semibold text-error">Πρώτα διαλέξτε πιο πάνω: νέο από το νέο κείμενο, ή κρατήστε αυτό.</p>}
        <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
          <SubmitButton pending="Έγκριση…">
            {draft.where === "home" ? "Έγκριση · μόνο για το σπίτι" : chosen ? `Έγκριση · ${chosen.room} · ${chosen.label}` : "Έγκριση"} <span aria-hidden="true">→</span>
          </SubmitButton>
          <span className="text-muted">Τίποτα δεν φτάνει στον ασθενή πριν από αυτό.</span>
        </div>
      </form>
    </div>
  );
}

