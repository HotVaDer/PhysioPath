// «Τι άλλαξε»: the app's own comparison of the edited template with the saved one.
import { describe, expect, it } from "vitest";

import type { PatientProgram } from "@/app/lib/notes/schema";
import { templateChanges } from "@/app/lib/templates/changes";

const program: PatientProgram = {
  title: "Πρόγραμμα ασκήσεων – Γόνατο",
  patient_first_name: null,
  next_appointment: null,
  exercises: [
    { name: "Ανυψώσεις τεντωμένου ποδιού", sets: 3, reps: "10", hold: null, frequency: "2 φορές τη μέρα", notes: null },
    { name: "Γλίστρημα φτέρνας", sets: 3, reps: "15", hold: null, frequency: null, notes: "Μέχρι να πονέσει λίγο." },
  ],
  after_exercises: ["Πάγος 20 λεπτά."],
  avoid: ["Όχι καθίσματα ακόμα."],
  contact_if: [],
  other: [],
};
const saved = { name: "Γόνατο ACL", area: "Γόνατο", program };

describe("templateChanges", () => {
  it("nothing changed: nothing listed (spaces, capitals and empty rows don't count)", () => {
    const same = { ...program, exercises: [...program.exercises, { name: "  ", sets: null, reps: null, hold: null, frequency: null, notes: null }] };
    expect(templateChanges(saved, { name: " γόνατο  ACL ", area: "Γόνατο", program: same })).toEqual([]);
  });

  it("an exercise out, one in, a dose and a note changed, instruction lines in and out", () => {
    const edited: PatientProgram = {
      ...program,
      exercises: [
        { ...program.exercises[0], sets: 2 },
        { name: "Γέφυρα", sets: 3, reps: "10", hold: null, frequency: "κάθε μέρα", notes: null },
      ],
      after_exercises: ["Πάγος 15 λεπτά."],
    };
    expect(templateChanges(saved, { ...saved, program: edited })).toEqual([
      { kind: "removed", text: "Γλίστρημα φτέρνας" },
      { kind: "changed", text: "Ανυψώσεις τεντωμένου ποδιού: 3 σετ × 10 επαναλήψεις · 2 φορές τη μέρα → 2 σετ × 10 επαναλήψεις · 2 φορές τη μέρα" },
      { kind: "added", text: "Γέφυρα · 3 σετ × 10 επαναλήψεις · κάθε μέρα" },
      { kind: "removed", text: "Μετά τις ασκήσεις: Πάγος 20 λεπτά." },
      { kind: "added", text: "Μετά τις ασκήσεις: Πάγος 15 λεπτά." },
    ]);
  });

  it("the name, the area and the title", () => {
    const changes = templateChanges(saved, { name: "Γόνατο – εβδ. 3", area: "", program: { ...program, title: "Γόνατο, φάση 2" } });
    expect(changes.map((c) => c.text)).toEqual([
      "Όνομα: «Γόνατο ACL» → «Γόνατο – εβδ. 3»",
      "Περιοχή: Γόνατο → καμία",
      "Τίτλος: «Πρόγραμμα ασκήσεων – Γόνατο» → «Γόνατο, φάση 2»",
    ]);
  });

  it("a note added to an exercise", () => {
    const edited = { ...program, exercises: [{ ...program.exercises[0], notes: "Αργά." }, program.exercises[1]] };
    expect(templateChanges(saved, { ...saved, program: edited })).toEqual([{ kind: "changed", text: "Ανυψώσεις τεντωμένου ποδιού: σημείωση «Αργά.»" }]);
  });
});
