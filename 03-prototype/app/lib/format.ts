// Small pure helpers that turn data into the words people see. No React, so they're easy to test.
import type { NoteLanguage } from "@/app/lib/prompt";
import type { ClinicalNote, Exercise, PatientProgram } from "@/app/lib/schema";

export const isBlank = (text: string | null | undefined) => !text || !text.trim();

const greekNumber = new Intl.NumberFormat("el-GR", { maximumFractionDigits: 1 });

// 1.8 → "1,8 δευτ."
export const formatSeconds = (seconds: number) => `${greekNumber.format(seconds)} δευτ.`;

// 42.3 → "0:42"
export const formatClock = (seconds: number) => `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, "0")}`;

// How much to do, written out in full for the patient, e.g. ["3 σετ × 10 επαναλήψεις", "Κρατήστε 5 δευτερόλεπτα", "2 φορές τη μέρα"].
export function doseLines(exercise: Exercise): string[] {
  const lines: string[] = [];
  const reps = exercise.reps?.trim();
  // A bare number means repetitions; anything else ("30 δευτερόλεπτα") is shown as the physio said it.
  const repsText = reps && /^\d+$/.test(reps) ? `${reps} επαναλήψεις` : reps;
  if (exercise.sets && repsText) lines.push(`${exercise.sets} σετ × ${repsText}`);
  else if (exercise.sets) lines.push(`${exercise.sets} σετ`);
  else if (repsText) lines.push(repsText);
  if (!isBlank(exercise.hold)) lines.push(`Κρατήστε ${exercise.hold!.trim()}`);
  if (!isBlank(exercise.frequency)) lines.push(exercise.frequency!.trim());
  return lines;
}

// The hold time in seconds, for the countdown on the session screen: "10 δευτερόλεπτα" → 10,
// "1 λεπτό" → 60, "μισό λεπτό" → 30. Anything else (or no hold) → null, so no countdown is shown.
const HOLD_NUMBER_WORDS: Record<string, number> = {
  ένα: 1, ενα: 1, μία: 1, μια: 1, δύο: 2, δυο: 2, τρία: 3, τρια: 3, πέντε: 5, πεντε: 5, δέκα: 10, δεκα: 10, δεκαπέντε: 15, δεκαπεντε: 15,
  είκοσι: 20, εικοσι: 20, τριάντα: 30, τριαντα: 30, σαράντα: 40, σαραντα: 40, εξήντα: 60, εξηντα: 60,
};
export function holdSeconds(hold: string | null): number | null {
  const text = hold?.trim().toLowerCase();
  if (!text) return null;
  if (/^μισό λεπτό|^μισο λεπτο/.test(text)) return 30;
  const match = /^(\d+(?:[.,]\d+)?|\p{L}+)\s*(δευτερ|δευτ\.?|sec|s\b|λεπτ|min)/u.exec(text);
  if (!match) return null;
  const amount = /\d/.test(match[1]) ? Number(match[1].replace(",", ".")) : HOLD_NUMBER_WORDS[match[1]];
  if (!amount) return null;
  const seconds = /^(λεπτ|min)/.test(match[2]) ? amount * 60 : amount;
  return seconds > 0 && seconds <= 600 ? Math.round(seconds) : null;
}

// The exercise fields a patient needs and the physio didn't say. Shown as "Λείπει" on the review page.
export const MISSING_CHECKS = ["sets", "reps", "frequency"] as const;
export type MissingField = { exercise: number; field: (typeof MISSING_CHECKS)[number] };

export function isMissing(exercise: Exercise, field: MissingField["field"]): boolean {
  return field === "sets" ? exercise.sets == null : isBlank(exercise[field]);
}

export function missingFields(program: PatientProgram): MissingField[] {
  return program.exercises.flatMap((exercise, i) => MISSING_CHECKS.filter((field) => isMissing(exercise, field)).map((field) => ({ exercise: i, field })));
}

// Clinical note sections in display order, with labels in the language the note was written in.
export const NOTE_FIELDS: Record<NoteLanguage, Record<keyof ClinicalNote, string>> = {
  el: {
    patient: "Ασθενής",
    body_area: "Περιοχή",
    stage: "Στάδιο",
    subjective: "Υποκειμενικά (S)",
    objective: "Αντικειμενικά (O)",
    treatment_today: "Θεραπεία σήμερα",
    home_program: "Πρόγραμμα στο σπίτι",
    precautions: "Προφυλάξεις",
    plan: "Πλάνο",
  },
  en: {
    patient: "Patient",
    body_area: "Area",
    stage: "Stage",
    subjective: "Subjective (S)",
    objective: "Objective (O)",
    treatment_today: "Treatment today",
    home_program: "Home exercise program",
    precautions: "Precautions",
    plan: "Plan",
  },
};

// The note as plain text, for pasting into the clinic's system. Empty sections are left out.
export function noteAsText(note: ClinicalNote, lang: NoteLanguage): string {
  return Object.entries(NOTE_FIELDS[lang])
    .filter(([key]) => !isBlank(note[key as keyof ClinicalNote]))
    .map(([key, label]) => `${label}: ${note[key as keyof ClinicalNote]!.trim()}`)
    .join("\n");
}
