// Small pure helpers that turn data into the words people see. No React, so they're easy to test.
import type { NoteLanguage } from "@/app/lib/notes/prompt";
import { ACTIVITY_CODES, GESY_PARTS, type ActivityCode, type ClinicalNote, type Exercise, type GesyPart, type PatientProgram } from "@/app/lib/notes/schema";

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

// The four GeSY parts with their labels, in the language the note was written in.
export const GESY_LABELS: Record<NoteLanguage, Record<GesyPart, string>> = {
  el: {
    service_given: "Παρεχόμενη υπηρεσία",
    assessment_findings: "Αποτελέσματα αξιολόγησης",
    treatment_plan: "Θεραπευτικό πλάνο",
    progress: "Εξέλιξη κατάστασης",
  },
  en: {
    service_given: "Service given",
    assessment_findings: "Assessment findings",
    treatment_plan: "Treatment plan",
    progress: "Progress",
  },
};

// GeSY parts the physio didn't fill. Flagged on the review page, never filled in by the app.
export const missingParts = (note: ClinicalNote): GesyPart[] => GESY_PARTS.filter((part) => isBlank(note[part]));

// The duration in the code's label: "PHYS02" → "30′".
export const activityMinutes = (code: ActivityCode) => ACTIVITY_CODES[code].split("·").pop()!.trim();

// The note as plain text, for pasting into the GeSY portal. Same header as 05-business/gesy.md:
// "Κλινική σημείωση · PHYS02 (30′) · Συνεδρία 4 · Δεξιός ώμος". An empty part stays visible as "—".
export function noteAsText(
  note: ClinicalNote,
  lang: NoteLanguage,
  header: { activityCode: ActivityCode; sessionNo: number },
): string {
  const title = lang === "el" ? "Κλινική σημείωση" : "Clinical note";
  const session = lang === "el" ? `Συνεδρία ${header.sessionNo}` : `Session ${header.sessionNo}`;
  const area = isBlank(note.body_area) ? [] : [note.body_area!.trim()];
  const first = [title, `${header.activityCode} (${activityMinutes(header.activityCode)})`, session, ...area].join(" · ");
  const missing = lang === "el" ? "— Δεν αναφέρθηκε" : "— Not mentioned";
  const parts = GESY_PARTS.map((part) => `${GESY_LABELS[lang][part]}:\n${isBlank(note[part]) ? missing : note[part]!.trim()}`);
  return [first, ...parts].join("\n\n");
}
