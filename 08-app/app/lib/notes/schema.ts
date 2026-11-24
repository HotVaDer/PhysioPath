// Shape of what Claude returns for one voice note.
// Used three ways: as Claude's output format (generate.ts), to validate data the browser sends back
// (route handlers, the approve action), and as the TypeScript types for the pages.
// Optional fields are required-but-nullable, so the model has to decide explicitly that the physio
// didn't say something instead of skipping it.
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

// The GeSY clinical note: every paid session needs these four parts (05-business/gesy.md).
// The activity code (PHYS01–04) and the session number are NOT here: the physio picks the code and the
// app counts the sessions. A part the physio didn't mention stays null; it is never filled in.
export const ClinicalNote = z.object({
  patient_ref: maybeText("Patient name or code as said."),
  body_area: maybeText("Body area and side, e.g. 'Δεξιός ώμος'."),
  service_given: maybeText(
    "Παρεχόμενη υπηρεσία: what was done in today's session (treatment, exercises done in the clinic), only as said.",
  ),
  assessment_findings: maybeText(
    "Αποτελέσματα αξιολόγησης: findings or measurements the physio stated (range of motion, strength, tests). Null if none were said.",
  ),
  treatment_plan: maybeText(
    "Θεραπευτικό πλάνο: the plan the physio stated, including the home program in compact clinical form (e.g. 'SLR 3x10 BID') and the next session.",
  ),
  progress: maybeText(
    "Εξέλιξη κατάστασης: how the patient is doing compared with before (pain scores, function), only as said.",
  ),
});

export const VoiceNoteResult = z.object({
  program: PatientProgram,
  note: ClinicalNote,
  missing_or_unclear: greekList(
    "Short questions for the physio, in Greek: missing sets/reps/frequency, missing GeSY parts, unclear words, possible transcription errors.",
  ),
});

// «Ίδιο πρόγραμμα»: only today's note and the questions (the stored program is not sent or changed).
export const NoteOnlyResult = z.object({
  note: ClinicalNote,
  missing_or_unclear: greekList("Short questions for the physio, in Greek, about today's session and missing GeSY parts only."),
});

// «Πείτε τα πρότυπά σας» (/templates/dictate): the physio says several of their usual programs at once,
// and each becomes a template they check and save. No patient in any of them.
export const DictatedTemplate = z.object({
  name: z.string().describe("The template's name, from the physio's own words, e.g. 'Γόνατο μετά ACL – εβδ. 1'."),
  area: maybeText("Body area as the physio said it, without the side, e.g. 'Γόνατο', 'Ώμος'. Null if not said."),
  program: PatientProgram.describe("The program as the physio said it. patient_first_name and next_appointment are always null."),
  questions: greekList("Short questions for the physio about this template only, in Greek: missing sets/reps/frequency, unclear words."),
});

export const TemplatesResult = z.object({
  templates: z.array(DictatedTemplate),
  missing_or_unclear: greekList("Short questions for the physio, in Greek, about the dictation as a whole (not about one template)."),
});

// «Αλλαγή με φωνή» (/templates/[id]/edit): one template with only the changes the physio said.
export const TemplateEditResult = z.object({
  // First, so the model goes through what was said before it writes the program.
  changes: z
    .array(
      z.object({
        said: z.string().describe("One change the physio said, in a few Greek words, e.g. 'Ποδήλατο, νέα άσκηση'."),
        applied: z.boolean().describe("True if it is in the program exactly and completely; false if any part was left out or is unclear."),
        question: maybeText(
          "A short Greek question for the physio when anything about this change is unclear or missing (which exercise, sets, repetitions, how often). Null only when it is clear and complete.",
        ),
      }),
    )
    .describe("Every change the physio said, one by one, in the order said."),
  name: maybeText("A new name for the template, only if the physio said to rename it. Null otherwise."),
  area: maybeText("A new body area, only if the physio said to change it. Null otherwise."),
  program: PatientProgram.describe("The template's program with the changes applied. patient_first_name and next_appointment are always null."),
  questions: greekList("Other short questions for the physio, in Greek (e.g. an unclear word, or that nothing changed). Not the ones already in changes."),
});

// At most this many templates from one dictation (the prompt says so too; more are cut, with a note).
export const MAX_DICTATED_TEMPLATES = 10;

export type Exercise = z.infer<typeof Exercise>;
export type PatientProgram = z.infer<typeof PatientProgram>;
export type ClinicalNote = z.infer<typeof ClinicalNote>;
export type VoiceNoteResult = z.infer<typeof VoiceNoteResult>;
export type NoteOnlyResult = z.infer<typeof NoteOnlyResult>;
export type DictatedTemplate = z.infer<typeof DictatedTemplate>;
export type TemplatesResult = z.infer<typeof TemplatesResult>;
export type TemplateEditResult = z.infer<typeof TemplateEditResult>;

// ---------- programs as saved in the database ----------
// An approved program is a record and is never rewritten, so every shape ever saved has to stay
// readable. Each saved program carries the version of its shape; a new shape later = version 2,
// a branch in readProgram() and the same version in private.valid_program() (the database check).
export const PROGRAM_VERSION = 1;
export type StoredProgram = PatientProgram & { version: typeof PROGRAM_VERSION };

// The one way to read programs.program. No "version" (saved before 2026-11-17) is the same shape as 1.
// null: a shape this code doesn't know, or data that doesn't fit it.
export function readProgram(json: unknown): PatientProgram | null {
  const version = json && typeof json === "object" && "version" in json ? json.version : 1;
  if (version !== 1) return null;
  const parsed = PatientProgram.safeParse(json);
  return parsed.success ? parsed.data : null;
}

// The four GeSY parts, in the order GeSY lists them.
export const GESY_PARTS = ["service_given", "assessment_findings", "treatment_plan", "progress"] as const;
export type GesyPart = (typeof GESY_PARTS)[number];

// Activity codes (Sep 2025 allied-health rules). The physio picks one; the app never guesses it.
export const ACTIVITY_CODES = {
  PHYS01: "Αξιολόγηση ή θεραπεία · 45′",
  PHYS02: "Θεραπεία · 30′",
  PHYS03: "Πρώτη αξιολόγηση και θεραπεία · 60′",
  PHYS04: "Ομαδική άσκηση · 45′",
} as const;
export type ActivityCode = keyof typeof ACTIVITY_CODES;
export const ActivityCode = z.enum(["PHYS01", "PHYS02", "PHYS03", "PHYS04"]);
