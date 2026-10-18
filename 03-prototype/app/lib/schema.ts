// Shape of what Claude returns for one voice note.
// Used three ways: as Claude's output format (generate.ts), to validate data the
// browser sends back (API routes), and as the TypeScript types for the pages.
// Optional fields are required-but-nullable, so the model has to decide
// explicitly that the physio didn't say something instead of skipping it.
import * as z from "zod";

const maybeText = (description: string) => z.string().nullable().describe(description);
const greekList = (description: string) => z.array(z.string()).describe(description);

export const Exercise = z.object({
  name: z.string().describe(
    "Patient-friendly Greek name. If the physio used an English term, add it in parentheses, e.g. 'Ανυψώσεις τεντωμένου ποδιού (straight leg raises)'.",
  ),
  sets: z.number().int().nullable().describe("Number of sets, only if stated."),
  reps: maybeText("Repetitions or duration per set as stated, e.g. '10' or '30 δευτερόλεπτα'."),
  hold: maybeText("Hold time if stated, e.g. '5 δευτερόλεπτα'."),
  frequency: maybeText("How often, as stated, e.g. '2 φορές τη μέρα'."),
  notes: maybeText("Anything else the physio said about this exercise, in plain Greek. Never add technique the physio didn't describe."),
});

export const PatientProgram = z.object({
  patient_first_name: maybeText("Patient's first name if mentioned."),
  title: z.string().describe("Short Greek title, e.g. 'Πρόγραμμα ασκήσεων – Αριστερό γόνατο'."),
  exercises: z.array(Exercise),
  after_exercises: greekList("What to do after the exercises (e.g. ice), plain Greek."),
  avoid: greekList("Things the patient should avoid, plain Greek."),
  contact_if: greekList("Warning signs the physio said to call about, plain Greek."),
  other: greekList("Any other instruction for the patient, plain Greek."),
  next_appointment: maybeText("Next session, if mentioned."),
});

export const ClinicalNote = z.object({
  patient: maybeText("Patient name as said."),
  body_area: maybeText("Body area and side."),
  stage: maybeText("E.g. 'week 3 post-op', 'chronic'."),
  subjective: maybeText("What the patient reported, if the physio mentioned it."),
  objective: maybeText("Findings or measurements, if mentioned."),
  treatment_today: maybeText("Treatment given in today's session, if mentioned."),
  home_program: maybeText("Home exercise program in compact clinical form, e.g. 'SLR 3x10 BID'."),
  precautions: maybeText("Precautions and restrictions."),
  plan: maybeText("Plan and next appointment, if mentioned."),
});

export const VoiceNoteResult = z.object({
  program: PatientProgram,
  note: ClinicalNote,
  missing_or_unclear: greekList(
    "Short questions for the physio, in Greek: missing sets/reps/frequency, unclear words, possible transcription errors.",
  ),
});

export type Exercise = z.infer<typeof Exercise>;
export type PatientProgram = z.infer<typeof PatientProgram>;
export type ClinicalNote = z.infer<typeof ClinicalNote>;
export type VoiceNoteResult = z.infer<typeof VoiceNoteResult>;
