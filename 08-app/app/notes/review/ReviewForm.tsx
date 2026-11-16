"use client";
// The review sheet: Ι. the patient's program, ΙΙ. the GeSY note, ΙΙΙ. where the patient exercises,
// then the signature and «Έγκριση». Every edit goes into the draft (sessionStorage). «Έγκριση» sends the
// draft to approveNote() (a server action), which checks it all again and saves it in one go.
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useRef, useState, type FormEvent } from "react";

import { SubmitButton } from "@/app/components/paper/Buttons";
import { FormAlert } from "@/app/components/paper/Notes";
import { PartHeading, Slip, SlipTitle } from "@/app/components/paper/StaffSheet";
import { cx } from "@/app/lib/cx";
import { approveNote, type ApproveState } from "@/app/lib/notes/actions";
import { approvalErrors, type ApprovalErrors, type SlotOption } from "@/app/lib/notes/approval";
import type { ProgramListField } from "@/app/lib/notes/draft";
import { useDraft } from "@/app/lib/notes/DraftContext";
import { GESY_LABELS, isMissing } from "@/app/lib/notes/format";
import { ACTIVITY_CODES, GESY_PARTS, type ActivityCode, type Exercise } from "@/app/lib/notes/schema";

type Props = { slots: SlotOption[]; notesPerPatient: Record<string, number>; signer: string; today: string };

const LISTS: { field: ProgramListField; label: string }[] = [
  { field: "avoid", label: "Αποφύγετε" },
  { field: "contact_if", label: "Πάρτε μας τηλέφωνο αν" },
  { field: "other", label: "Άλλες οδηγίες" },
  { field: "after_exercises", label: "Μετά τις ασκήσεις" },
];

const COLUMNS: { field: keyof Exercise; label: string; width: string; check?: "sets" | "reps" | "frequency"; numeric?: boolean }[] = [
  { field: "sets", label: "Σετ", width: "w-[76px]", check: "sets", numeric: true },
  { field: "reps", label: "Επαναλήψεις", width: "w-[150px]", check: "reps" },
  { field: "hold", label: "Κράτημα", width: "w-[130px]" },
  { field: "frequency", label: "Πόσο συχνά", width: "w-[150px]", check: "frequency" },
];

const cell = "min-h-11 w-full border-0 border-b-2 bg-transparent px-1 font-typed text-[17px] text-ink placeholder:text-muted";
const missingCell = "border-ink bg-tab-yellow placeholder:italic placeholder:text-ink";

export function ReviewForm({ slots, notesPerPatient, signer, today }: Props) {
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

  if (!ready) return <p className="italic text-muted">Φόρτωση…</p>;
  const result = draft.result;
  if (!result) {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="font-display text-[34px] leading-tight sm:text-[40px]">Δεν υπάρχει πρόγραμμα για έλεγχο</h1>
        <p>Ξεκινήστε από μια νέα σημείωση. Αν μόλις εγκρίνατε ένα πρόγραμμα, θα το βρείτε στην αίθουσα.</p>
        <Link href="/notes/new" className="self-start">
          Νέα σημείωση
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
  const needsAssessment = (draft.activityCode === "PHYS01" || draft.activityCode === "PHYS03") && !note.assessment_findings?.trim();

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    const found = approvalErrors({ patient, program, activityCode: draft.activityCode, where: draft.where });
    setLocal(found);
    if (Object.keys(found).length > 0) {
      event.preventDefault();
      const first = Object.keys(found)[0];
      requestAnimationFrame(() => document.getElementById(`f-${first}`)?.focus());
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
  });

  return (
    <div className="flex flex-col gap-7">
      <div className="flex flex-col gap-2">
        <Link href="/notes/new" className="self-start text-base">
          Πίσω στο κείμενο
        </Link>
        <h1 className="font-display text-[34px] leading-tight sm:text-[40px]">Έλεγχος και έγκριση</h1>
        <p className="font-typed text-[17px]">
          {patient.label.trim() || "Ασθενής χωρίς όνομα"}
          {note.body_area?.trim() ? ` · ${note.body_area.trim()}` : ""} · {today}
        </p>
        <p className="italic text-muted">Γράψαμε μόνο ό,τι είπατε. Ό,τι λείπει το αφήσαμε κενό και σας ρωτάμε.</p>
      </div>

      {questions.length > 0 && (
        <Slip tint="yellow" labelledBy="q-h" className="-rotate-[0.6deg]">
          <SlipTitle id="q-h">{questions.length === 1 ? "1 ΕΡΩΤΗΣΗ ΓΙΑ ΕΣΑΣ" : `${questions.length} ΕΡΩΤΗΣΕΙΣ ΓΙΑ ΕΣΑΣ`}</SlipTitle>
          <ol className="flex list-decimal flex-col gap-1 pl-6">
            {questions.map((q, i) => (
              <li key={i}>{q}</li>
            ))}
          </ol>
        </Slip>
      )}

      {/* Ι. Πρόγραμμα για τον ασθενή */}
      <section aria-labelledby="p-h" className="flex flex-col gap-4 border-t border-hairline pt-5">
        <PartHeading id="p-h" mark="Ι." note="Αυτό βλέπει ο ασθενής στο κινητό του, με απλά λόγια.">
          Πρόγραμμα για τον ασθενή
        </PartHeading>

        <TextRow id="p-title" label="Τίτλος" value={program.title} width="max-w-[520px]" onChange={(v) => dispatch({ type: "setProgramText", field: "title", value: v })} />
        <TextRow
          id="p-name"
          label="Για"
          value={program.patient_first_name ?? ""}
          width="max-w-[240px]"
          onChange={(v) => dispatch({ type: "setProgramText", field: "patient_first_name", value: v })}
        />

        <div className="overflow-x-auto">
          <table className="w-full min-w-[780px] border-collapse text-base" aria-describedby={errors.exercises ? "f-exercises-error" : undefined}>
            <caption className="pb-1.5 text-left text-base">Ασκήσεις. Τα κίτρινα κουτιά λείπουν: συμπληρώστε τα ή αφήστε τα κενά.</caption>
            <thead>
              <tr className="border-b-2 border-ink text-[15px]">
                <th scope="col" className="w-11 px-1.5 py-2 text-left font-semibold">
                  Α/Α
                </th>
                <th scope="col" className="px-1.5 py-2 text-left font-semibold">
                  Άσκηση
                </th>
                {COLUMNS.map((c) => (
                  <th key={c.field} scope="col" className={cx(c.width, "px-1.5 py-2 text-left font-semibold")}>
                    {c.label}
                  </th>
                ))}
                <th scope="col" className="w-12 px-1.5 py-2">
                  <span className="sr-only">Αφαίρεση</span>
                </th>
              </tr>
            </thead>
            {program.exercises.map((exercise, i) => {
              const n = i + 1;
              const name = exercise.name.trim() || `άσκηση ${n}`;
              return (
                <tbody key={i} className="border-b border-ledger">
                  <tr>
                    <td className="px-1.5 pt-2 align-top font-typed font-bold">{String(n).padStart(2, "0")}</td>
                    <td className="p-1.5">
                      <input
                        id={i === 0 ? "f-exercises" : undefined}
                        type="text"
                        aria-label={`Άσκηση ${n}`}
                        value={exercise.name}
                        onChange={(e) => dispatch({ type: "setExercise", index: i, field: "name", value: e.target.value })}
                        className={cx(cell, "border-line")}
                      />
                    </td>
                    {COLUMNS.map((c) => {
                      const missing = c.check ? isMissing(exercise, c.check) : false;
                      const value = exercise[c.field];
                      return (
                        <td key={c.field} className="p-1.5">
                          <input
                            type="text"
                            inputMode={c.numeric ? "numeric" : undefined}
                            aria-label={`${c.label}, ${name}${missing ? ", λείπει" : ""}`}
                            placeholder={missing ? "λείπει" : "—"}
                            value={value == null ? "" : String(value)}
                            onChange={(e) => dispatch({ type: "setExercise", index: i, field: c.field, value: e.target.value })}
                            className={cx(cell, missing ? missingCell : "border-line")}
                          />
                        </td>
                      );
                    })}
                    <td className="p-1.5 text-center">
                      <button
                        type="button"
                        onClick={() => dispatch({ type: "removeExercise", index: i })}
                        aria-label={`Αφαίρεση: ${name}`}
                        className="size-11 cursor-pointer font-typed text-[22px] text-muted hover:text-ink"
                      >
                        ×
                      </button>
                    </td>
                  </tr>
                  <tr>
                    <td />
                    <td colSpan={6} className="px-1.5 pb-2.5">
                      <input
                        type="text"
                        aria-label={`Σημειώσεις για τον ασθενή, ${name}`}
                        placeholder="Σημειώσεις για τον ασθενή (προαιρετικά)"
                        value={exercise.notes ?? ""}
                        onChange={(e) => dispatch({ type: "setExercise", index: i, field: "notes", value: e.target.value })}
                        className="min-h-11 w-full border-0 border-b border-dashed border-line bg-transparent px-1 text-base text-ink placeholder:italic placeholder:text-muted"
                      />
                    </td>
                  </tr>
                </tbody>
              );
            })}
          </table>
        </div>
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
          <button
            type="button"
            onClick={() => dispatch({ type: "addExercise" })}
            className="min-h-11 cursor-pointer font-semibold text-action underline underline-offset-[3px] hover:text-ink"
          >
            + Προσθήκη άσκησης
          </button>
          {draft.removed && (
            <p role="status" className="flex flex-wrap items-center gap-x-3 text-base">
              Αφαιρέθηκε: «{draft.removed.exercise.name || "άσκηση χωρίς όνομα"}».
              <button type="button" onClick={() => dispatch({ type: "undoRemove" })} className="min-h-11 cursor-pointer text-action underline underline-offset-[3px] hover:text-ink">
                Αναίρεση
              </button>
            </p>
          )}
        </div>
        {errors.exercises && (
          <p id="f-exercises-error" className="font-semibold text-error">
            {errors.exercises}
          </p>
        )}

        <div className="flex flex-wrap gap-x-7 gap-y-4">
          {LISTS.map(({ field, label }) => (
            <div key={field} className="flex min-w-0 flex-[1_1_320px] flex-col gap-1">
              <label htmlFor={`l-${field}`} className="text-base">
                {label} <span className="italic text-muted">· μία γραμμή για καθένα</span>
              </label>
              <textarea
                id={`l-${field}`}
                rows={2}
                placeholder="Δεν αναφέρθηκε"
                value={program[field].join("\n")}
                onChange={(e) => dispatch({ type: "setProgramList", field, items: e.target.value.split("\n") })}
                className="ruled-32 w-full resize-y border-0 border-b-2 border-line px-1.5 font-typed text-[17px] leading-8 text-ink placeholder:italic placeholder:text-muted"
              />
            </div>
          ))}
        </div>
        <TextRow
          id="p-next"
          label="Επόμενο ραντεβού"
          value={program.next_appointment ?? ""}
          width="max-w-[300px]"
          onChange={(v) => dispatch({ type: "setProgramText", field: "next_appointment", value: v })}
        />
      </section>

      {/* ΙΙ. Κλινική σημείωση · ΓεΣΥ */}
      <section aria-labelledby="n-h" className="flex flex-col gap-4 border-t border-hairline pt-5">
        <PartHeading id="n-h" mark="ΙΙ." note="Μένει στην κλινική. Ο ασθενής και οι βοηθοί δεν τη βλέπουν ποτέ.">
          Κλινική σημείωση · ΓεΣΥ{lang === "en" ? " · English" : ""}
        </PartHeading>

        <div className="flex flex-wrap gap-x-8 gap-y-4 border-2 border-ink px-4 py-3.5">
          <div className="flex flex-[1_1_280px] flex-col gap-0.5">
            <label htmlFor="f-activityCode" className="text-[15px]">
              Κωδικός πράξης
            </label>
            <select
              id="f-activityCode"
              value={draft.activityCode ?? ""}
              onChange={(e) => dispatch({ type: "setActivityCode", code: (e.target.value || null) as ActivityCode | null })}
              aria-invalid={errors.activityCode ? true : undefined}
              aria-describedby={cx("f-activityCode-hint", errors.activityCode && "f-activityCode-error")}
              className={cx("min-h-11 rounded-none border-0 border-b-2 bg-transparent px-1 font-typed text-[17px] text-ink", errors.activityCode ? "border-error" : "border-line")}
            >
              <option value="">Διαλέξτε…</option>
              {(Object.keys(ACTIVITY_CODES) as ActivityCode[]).map((code) => (
                <option key={code} value={code}>
                  {code} · {ACTIVITY_CODES[code]}
                </option>
              ))}
            </select>
            <span id="f-activityCode-hint" className="text-[15px] italic text-muted">
              Τον διαλέγετε εσείς, δεν τον μαντεύουμε.
            </span>
            {errors.activityCode && (
              <span id="f-activityCode-error" className="font-semibold text-error">
                {errors.activityCode}
              </span>
            )}
          </div>
          <div className="flex flex-[0_1_180px] flex-col gap-0.5">
            <span className="text-[15px]">Συνεδρία</span>
            <span className="flex min-h-11 items-center font-typed text-[22px] font-bold">{sessionNo}η</span>
            <span className="text-[15px] italic text-muted">{patient.id ? "από το ιστορικό του ασθενή" : "πρώτη σημείωση για νέο ασθενή"}</span>
          </div>
          <div className="flex flex-[1_1_200px] flex-col gap-0.5">
            <label htmlFor="n-area" className="text-[15px]">
              Περιοχή
            </label>
            <input
              id="n-area"
              type="text"
              value={note.body_area ?? ""}
              onChange={(e) => dispatch({ type: "setNote", field: "body_area", value: e.target.value })}
              className="min-h-11 border-0 border-b-2 border-line bg-transparent px-1 font-typed text-[17px] text-ink"
            />
          </div>
        </div>

        {GESY_PARTS.map((part, i) => {
          const missing = !note[part]?.trim();
          const id = `n-${part}`;
          return (
            <div key={part} className={cx("flex flex-col gap-1", missing && "border-2 border-ink bg-tab-yellow px-3.5 py-3")}>
              <label htmlFor={id} className="text-[17px] font-semibold">
                {i + 1}. {GESY_LABELS[lang][part]}
                {missing && <span className="font-typed text-sm font-bold"> · ΛΕΙΠΕΙ</span>}
              </label>
              <textarea
                id={id}
                rows={2}
                lang={lang}
                placeholder={lang === "el" ? "Δεν αναφέρθηκε" : "Not mentioned"}
                value={note[part] ?? ""}
                aria-describedby={missing ? `${id}-hint` : undefined}
                onChange={(e) => dispatch({ type: "setNote", field: part, value: e.target.value })}
                className="ruled-32 w-full resize-y border-0 border-b-2 border-line px-1.5 font-typed text-[17px] leading-8 text-ink placeholder:italic placeholder:text-muted"
              />
              {missing && (
                <span id={`${id}-hint`} className="text-[15px] italic">
                  Δεν το συμπληρώνουμε εμείς. Γράψτε το ή αφήστε το κενό.
                  {part === "assessment_findings" && needsAssessment ? ` Με ${draft.activityCode} ο ΓεΣΥ ζητά αποτελέσματα αξιολόγησης.` : ""}
                </span>
              )}
            </div>
          );
        })}
      </section>

      {/* ΙΙΙ. Πού ασκείται τώρα */}
      <section aria-labelledby="w-h" className="flex flex-col gap-3 border-t border-hairline pt-5">
        <PartHeading id="w-h" mark="ΙΙΙ.">
          Πού ασκείται τώρα;
        </PartHeading>
        <fieldset aria-describedby={errors.where ? "f-where-error" : undefined} className="flex flex-col gap-1">
          <legend className="sr-only">Θέση στην αίθουσα</legend>
          {free.length > 0 && (
            <div className="flex flex-wrap gap-x-7 gap-y-1">
              {free.map((s, i) => (
                <label key={s.value} className="flex min-h-11 cursor-pointer items-center gap-3">
                  <input
                    id={i === 0 ? "f-where" : undefined}
                    type="radio"
                    name="where"
                    checked={draft.where === s.value}
                    onChange={() => dispatch({ type: "setWhere", where: s.value })}
                    className="size-[22px] accent-action"
                  />
                  {s.room} · {s.label}
                </label>
              ))}
            </div>
          )}
          <label className="flex min-h-11 cursor-pointer items-center gap-3">
            <input
              id={free.length === 0 ? "f-where" : undefined}
              type="radio"
              name="where"
              checked={draft.where === "home"}
              onChange={() => dispatch({ type: "setWhere", where: "home" })}
              className="size-[22px] accent-action"
            />
            <span>
              Μόνο για το σπίτι <span className="text-base italic text-muted">· δεν ασκείται τώρα στην κλινική</span>
            </span>
          </label>
        </fieldset>
        {taken.length > 0 && (
          <p className="text-base">
            <span className="italic">Πιασμένες:</span>{" "}
            <span className="font-typed">{taken.map((s) => `${s.room} · ${s.label} (${s.takenBy})`).join(", ")}</span>
          </p>
        )}
        {free.length === 0 && slots.length > 0 && <p className="text-base italic">Όλες οι θέσεις είναι πιασμένες αυτή τη στιγμή.</p>}
        {errors.where && (
          <p id="f-where-error" className="font-semibold text-error">
            {errors.where}
          </p>
        )}
      </section>

      {/* Υπογραφή και έγκριση */}
      <form ref={formRef} action={action} onSubmit={onSubmit} noValidate className="flex flex-col gap-4 border-t-[3px] border-double border-ink pt-4">
        <input type="hidden" name="payload" value={payload} />
        {errors.patient && (
          <p id="f-patient" tabIndex={-1} className="font-semibold text-error">
            {errors.patient} <Link href="/notes/new">Στο Α. Ασθενής</Link>
          </p>
        )}
        <div className="flex flex-wrap items-end gap-x-10 gap-y-5">
          <div className="flex flex-[1_1_300px] flex-col gap-0.5">
            <span className="min-h-9 px-1 text-[30px] italic leading-tight">{signer}</span>
            <span className="border-t-2 border-line pt-1 text-[15px]">Φυσιοθεραπευτής · {signer}</span>
          </div>
          <div className="flex flex-[0_1_180px] flex-col gap-0.5">
            <span className="px-1 font-typed text-xl">{today}</span>
            <span className="border-t-2 border-line pt-1 text-[15px]">Ημερομηνία</span>
          </div>
        </div>
        <p className="max-w-[64ch] text-base">
          {questions.length > 0 ? `Υπάρχουν ${questions.length} ανοιχτές ερωτήσεις. Μπορείτε να εγκρίνετε και έτσι: τα κενά μένουν κενά. ` : ""}
          Μετά την έγκριση το πρόγραμμα δεν αλλάζει· για αλλαγές γράφετε νέα σημείωση.
        </p>
        <FormAlert>{state.message}</FormAlert>
        <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
          <SubmitButton pending="Έγκριση…">
            {draft.where === "home" ? "Έγκριση · μόνο για το σπίτι" : chosen ? `Έγκριση · ${chosen.label}` : "Έγκριση"} <span aria-hidden="true">→</span>
          </SubmitButton>
          <span className="text-base italic text-muted">Τίποτα δεν φτάνει στον ασθενή πριν από αυτό.</span>
        </div>
      </form>
    </div>
  );
}

function TextRow({ id, label, value, width, onChange }: { id: string; label: string; value: string; width: string; onChange: (value: string) => void }) {
  return (
    <div className="flex flex-wrap items-baseline gap-x-3.5 gap-y-1">
      <label htmlFor={id} className="text-base sm:flex-[0_0_160px]">
        {label}
      </label>
      <input
        id={id}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cx("min-h-11 w-full flex-[1_1_220px] border-0 border-b-2 border-line bg-transparent px-1 font-typed text-[19px] text-ink", width)}
      />
    </div>
  );
}
