// The physio's work in progress: transcript, Claude's result and the edits to it.
// Every change goes through one reducer, so all the rules live here and are easy to test
// (same state + same action → same new state, no React needed).
import * as z from "zod";

import { Fix, undoFix } from "@/app/lib/fixes";
import { NoteLanguage } from "@/app/lib/prompt";
import { Exercise, VoiceNoteResult, type ClinicalNote } from "@/app/lib/schema";

const Timings = z.object({
  recording: z.number().optional(), // seconds of audio
  transcribe: z.number().optional(), // seconds Whisper took
  proofread: z.number().optional(), // seconds the proofreader took
  generate: z.number().optional(), // seconds Claude took
});

// Also used to check a draft read back from sessionStorage, so a broken or old one is ignored.
export const Draft = z.object({
  transcript: z.string(),
  fixes: z.array(Fix).default([]), // words the proofreader corrected in the transcript, for undo
  noteLang: NoteLanguage, // language for the next clinical note
  result: VoiceNoteResult.nullable(),
  resultNoteLang: NoteLanguage, // language the current note was written in
  timings: Timings,
  removed: z.object({ exercise: Exercise, index: z.number().int() }).nullable(), // last removed exercise, for undo
});
export type Draft = z.infer<typeof Draft>;

export const emptyDraft: Draft = { transcript: "", fixes: [], noteLang: "el", result: null, resultNoteLang: "el", timings: {}, removed: null };

export const emptyExercise = (): Exercise => ({ name: "", sets: null, reps: null, hold: null, frequency: null, notes: null });

export type ProgramTextField = "title" | "patient_first_name" | "next_appointment";
export type ProgramListField = "after_exercises" | "avoid" | "contact_if" | "other";

export type DraftAction =
  | { type: "restore"; draft: Draft }
  | { type: "typeTranscript"; text: string }
  | { type: "pickSample"; text: string }
  | { type: "transcribed"; text: string; fixes: Fix[]; seconds: number; proofreadSeconds?: number; recordingSeconds?: number }
  | { type: "undoFix"; index: number }
  | { type: "setNoteLang"; lang: NoteLanguage }
  | { type: "generated"; result: VoiceNoteResult; seconds: number; noteLang: NoteLanguage }
  | { type: "setProgramText"; field: ProgramTextField; value: string }
  | { type: "setProgramList"; field: ProgramListField; items: string[] }
  | { type: "setExercise"; index: number; field: keyof Exercise; value: string }
  | { type: "addExercise" }
  | { type: "removeExercise"; index: number }
  | { type: "undoRemove" }
  | { type: "setNote"; field: keyof ClinicalNote; value: string }
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

export function draftReducer(draft: Draft, action: DraftAction): Draft {
  switch (action.type) {
    case "restore":
      return action.draft;
    case "typeTranscript":
      return { ...draft, transcript: action.text };
    case "pickSample":
      return { ...draft, transcript: action.text, fixes: [], timings: {} }; // no recording, so no timings or fixes
    case "transcribed":
      return {
        ...draft,
        transcript: action.text,
        fixes: action.fixes,
        timings: { recording: action.recordingSeconds, transcribe: action.seconds, proofread: action.proofreadSeconds || undefined },
      };
    case "undoFix": {
      const fix = draft.fixes[action.index];
      if (!fix) return draft;
      return { ...draft, transcript: undoFix(draft.transcript, fix), fixes: draft.fixes.filter((_, i) => i !== action.index) };
    }
    case "setNoteLang":
      return { ...draft, noteLang: action.lang };
    case "generated":
      return {
        ...draft,
        result: action.result,
        resultNoteLang: action.noteLang,
        timings: { ...draft.timings, generate: action.seconds },
        removed: null,
      };
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
