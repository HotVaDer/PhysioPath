// The physio's work in progress: transcript, Claude's result and the edits to it.
// Every change goes through one reducer, so all the rules live here and are easy to test
// (same state + same action → same new state, no React needed).
import * as z from "zod";

import { NoteLanguage } from "@/app/lib/notes/prompt";
import { ActivityCode, Exercise, PatientProgram, VoiceNoteResult, type ClinicalNote } from "@/app/lib/notes/schema";

const Timings = z.object({
  recording: z.number().optional(), // seconds of audio
  transcribe: z.number().optional(), // seconds speech-to-text took
  generate: z.number().optional(), // seconds Claude took
});

// Also used to check a draft read back from sessionStorage, so a broken or old one is ignored.
export const Draft = z.object({
  transcript: z.string(),
  noteLang: NoteLanguage, // language for the next clinical note
  result: VoiceNoteResult.nullable(),
  resultNoteLang: NoteLanguage, // language the current note was written in
  timings: Timings,
  removed: z.object({ exercise: Exercise, index: z.number().int() }).nullable(), // last removed exercise, for undo
  // Who the note is for: an existing patient (id) or a new one (label only, created on approval).
  patient: z.object({ id: z.uuid().nullable(), label: z.string() }).nullable().default(null),
  // A new id for every generated result: approving the same result twice gives one program (approve_program).
  draftId: z.uuid().nullable().default(null),
  activityCode: ActivityCode.nullable().default(null), // picked by the physio, never preselected
  where: z.string().nullable().default(null), // "<roomId>:<slot>" or "home"
  // «Νέα συνεδρία» step 2: "new" = record a new program (as always), "same" = «Ίδιο πρόγραμμα»: the patient
  // keeps the stored program (base, read-only) and only today's GeSY note is written.
  mode: z.enum(["new", "same"]).default("new"),
  base: z.object({ programId: z.uuid(), approvedAt: z.string(), program: PatientProgram }).nullable().default(null),
  // «Ξεκινήστε από πρότυπο» on the recording page (a new program only): the clinic's template the program
  // starts from. asIs («Όπως είναι»): the program is the template unchanged and the AI writes only the note;
  // otherwise («Με αλλαγές») the server reads the template and the AI applies the changes the physio says.
  template: z.object({ id: z.uuid(), name: z.string(), asIs: z.boolean().default(false) }).nullable().default(null),
  // The «Περιοχή σώματος» of this patient's last note (read in step 2), for «Προτεινόμενα» templates.
  patientArea: z.string().nullable().default(null),
  // The clinic this note belongs to: stamped by DraftProvider with the open clinic when the note starts
  // and again whenever the patient is chosen (from that clinic's list). Someone in several clinics can
  // open another one meanwhile: the patient, program and beds are this clinic's, so «Έγκριση» refuses
  // the note while another clinic is open.
  clinicId: z.uuid().nullable().default(null),
  // The text the result was made from. If the physio changes the text afterwards (records again, types,
  // picks an example), the result no longer matches it: see isStale. null on drafts saved before this.
  resultTranscript: z.string().nullable().default(null),
  // Who is writing this note: stamped by DraftProvider with the signed-in person. Another person signing
  // in on the same tab (a shared clinic computer) never gets it: DraftProvider throws it away.
  userId: z.uuid().nullable().default(null),
});
export type Draft = z.infer<typeof Draft>;

export const emptyDraft: Draft = {
  transcript: "", noteLang: "el", result: null, resultNoteLang: "el", timings: {}, removed: null,
  patient: null, draftId: null, activityCode: null, where: null, mode: "new", base: null, template: null, patientArea: null, clinicId: null,
  resultTranscript: null, userId: null,
};

export const emptyExercise = (): Exercise => ({ name: "", sets: null, reps: null, hold: null, frequency: null, notes: null });

export type ProgramTextField = "title" | "patient_first_name" | "next_appointment";
export type ProgramListField = "after_exercises" | "avoid" | "contact_if" | "other";

export type DraftAction =
  | { type: "restore"; draft: Draft }
  | { type: "typeTranscript"; text: string }
  | { type: "pickSample"; text: string }
  | { type: "transcribed"; text: string; seconds: number; recordingSeconds?: number; startedFor?: string }
  | { type: "setNoteLang"; lang: NoteLanguage }
  | { type: "generated"; result: VoiceNoteResult; seconds: number; noteLang: NoteLanguage; draftId: string; startedFor?: string; transcript?: string }
  | { type: "keepResult" }
  | { type: "setPatient"; patient: { id: string | null; label: string } | null }
  | { type: "setMode"; mode: "new" | "same"; base: Draft["base"] }
  | { type: "setTemplate"; template: Draft["template"] }
  | { type: "setPatientArea"; area: string | null }
  | { type: "setActivityCode"; code: ActivityCode | null }
  | { type: "setWhere"; where: string | null }
  | { type: "setProgramText"; field: ProgramTextField; value: string }
  | { type: "setProgramList"; field: ProgramListField; items: string[] }
  | { type: "setExercise"; index: number; field: keyof Exercise; value: string }
  | { type: "addExercise" }
  | { type: "removeExercise"; index: number }
  | { type: "undoRemove" }
  | { type: "setNote"; field: keyof ClinicalNote; value: string }
  | { type: "stampClinic"; clinicId: string }
  | { type: "stampUser"; userId: string }
  | { type: "reset" };

// Optional text: an emptied field means "not said" (null). Text is stored as typed, not trimmed,
// so spaces don't vanish while typing.
const optional = (value: string) => (value === "" ? null : value);

function exerciseValue(field: keyof Exercise, value: string): Exercise[keyof Exercise] {
  if (field === "name") return value;
  if (field === "sets") {
    const n = Number.parseInt(value, 10);
    return Number.isInteger(n) && n > 0 ? n : null;
  }
  return optional(value);
}

// Which note a slow answer belongs to: the patient, new program or «Ίδιο πρόγραμμα» (and which one), and
// the template it starts from.
// The recording and the generation take seconds; RecordForm stamps this when it starts, and an answer
// that arrives after the physio picked someone or something else is thrown away (startedFor).
export function noteFor(draft: Draft): string {
  return JSON.stringify([
    draft.patient?.id ?? null,
    draft.patient?.label ?? null,
    draft.mode,
    draft.base?.programId ?? null,
    draft.template?.id ?? null,
    draft.template?.asIs ?? null,
  ]);
}

// The text changed after the program (or note) was made from it: approving it would approve something
// made from words the physio has since replaced. Spaces and line breaks at the ends don't count.
export function isStale(draft: Draft): boolean {
  return draft.result !== null && draft.resultTranscript !== null && draft.resultTranscript.trim() !== draft.transcript.trim();
}

export function draftReducer(draft: Draft, action: DraftAction): Draft {
  if ((action.type === "transcribed" || action.type === "generated") && action.startedFor !== undefined && action.startedFor !== noteFor(draft)) {
    return draft; // a late answer for another patient (or the other choice): never put it on this one
  }
  switch (action.type) {
    case "restore":
      return action.draft;
    case "typeTranscript":
      return { ...draft, transcript: action.text };
    case "pickSample":
      return { ...draft, transcript: action.text, timings: {} }; // no recording, so no timings
    case "transcribed":
      return {
        ...draft,
        transcript: action.text,
        timings: { recording: action.recordingSeconds, transcribe: action.seconds },
      };
    case "setNoteLang":
      return { ...draft, noteLang: action.lang };
    case "generated":
      return {
        ...draft,
        result: action.result,
        resultNoteLang: action.noteLang,
        timings: { ...draft.timings, generate: action.seconds },
        removed: null,
        draftId: action.draftId,
        resultTranscript: action.transcript ?? draft.transcript, // the text that was sent
      };
    case "keepResult":
      // «Κράτα αυτό»: the physio checked that the result still fits the changed text.
      return draft.result ? { ...draft, resultTranscript: draft.transcript } : draft;
    case "setPatient": {
      // Another patient: the program choice and anything generated belonged to the old one.
      // The patient is chosen from the open clinic's list, so the note now belongs to the open clinic:
      // clinicId is cleared and DraftProvider stamps the open one at once. (Bug 2026-11-18: a stamp left
      // over from a note in another clinic, in the same tab, made «Έγκριση» refuse a note of this one.)
      const other = (action.patient?.id ?? null) !== (draft.patient?.id ?? null);
      return other
        ? { ...draft, patient: action.patient, mode: "new", base: null, template: null, patientArea: null, result: null, draftId: null, removed: null, clinicId: null }
        : { ...draft, patient: action.patient, clinicId: null };
    }
    case "setMode":
      // A different choice: what was generated for the other one no longer fits (the transcript stays).
      if (draft.mode === action.mode && draft.base?.programId === action.base?.programId) return draft;
      // «Ίδιο πρόγραμμα» writes no program, so no template either.
      return {
        ...draft,
        mode: action.mode,
        base: action.mode === "same" ? action.base : null,
        template: action.mode === "same" ? null : draft.template,
        result: null,
        draftId: null,
        removed: null,
      };
    case "setTemplate":
      // Another template (or none), or «Όπως είναι» ↔ «Με αλλαγές»: a program made the other way no longer
      // fits (the transcript stays).
      if (
        draft.mode === "same" ||
        ((draft.template?.id ?? null) === (action.template?.id ?? null) && (draft.template?.asIs ?? null) === (action.template?.asIs ?? null))
      )
        return draft;
      return { ...draft, template: action.template, result: null, draftId: null, removed: null };
    case "setPatientArea":
      return draft.patientArea === action.area ? draft : { ...draft, patientArea: action.area };
    case "setActivityCode":
      return { ...draft, activityCode: action.code };
    case "setWhere":
      return { ...draft, where: action.where };
    case "stampClinic":
      // Only once: a note keeps the clinic it was started in (a new note, after «reset», gets the open one).
      return draft.clinicId ? draft : { ...draft, clinicId: action.clinicId };
    case "stampUser":
      return draft.userId ? draft : { ...draft, userId: action.userId };
    case "reset":
      return { ...emptyDraft, noteLang: draft.noteLang }; // keep the physio's language choice
  }

  // Everything below edits the result, so there has to be one.
  const result = draft.result;
  if (!result) return draft;
  const program = result.program;
  const withProgram = (changes: Partial<typeof program>, extra: Partial<Draft> = {}): Draft => ({
    ...draft,
    ...extra,
    result: { ...result, program: { ...program, ...changes } },
  });

  switch (action.type) {
    case "setProgramText":
      return withProgram({ [action.field]: action.field === "title" ? action.value : optional(action.value) });
    case "setProgramList":
      return withProgram({ [action.field]: action.items });
    case "setExercise":
      return withProgram({
        exercises: program.exercises.map((exercise, i) =>
          i === action.index ? { ...exercise, [action.field]: exerciseValue(action.field, action.value) } : exercise,
        ),
      });
    case "addExercise":
      return withProgram({ exercises: [...program.exercises, emptyExercise()] });
    case "removeExercise": {
      const exercise = program.exercises[action.index];
      if (!exercise) return draft;
      return withProgram({ exercises: program.exercises.filter((_, i) => i !== action.index) }, { removed: { exercise, index: action.index } });
    }
    case "undoRemove": {
      if (!draft.removed) return draft;
      const exercises = [...program.exercises];
      exercises.splice(Math.min(draft.removed.index, exercises.length), 0, draft.removed.exercise);
      return withProgram({ exercises }, { removed: null });
    }
    case "setNote":
      return { ...draft, result: { ...result, note: { ...result.note, [action.field]: optional(action.value) } } };
  }
  return draft;
}

// Reads a saved draft; anything that doesn't match the current shape gives null.
export function parseDraft(json: string | null): Draft | null {
  if (!json) return null;
  try {
    const parsed = Draft.safeParse(JSON.parse(json));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}
