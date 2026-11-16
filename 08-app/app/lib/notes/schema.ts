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

export type Exercise = z.infer<typeof Exercise>;
export type PatientProgram = z.infer<typeof PatientProgram>;
export type ClinicalNote = z.infer<typeof ClinicalNote>;
export type VoiceNoteResult = z.infer<typeof VoiceNoteResult>;

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
