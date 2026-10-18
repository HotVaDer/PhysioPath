import { describe, expect, it } from "vitest";

import { doseLines, formatClock, formatSeconds, holdSeconds, missingFields, noteAsText } from "@/app/lib/format";
import type { ClinicalNote, Exercise, PatientProgram } from "@/app/lib/schema";

const exercise = (changes: Partial<Exercise>): Exercise => ({ name: "Γέφυρα", sets: null, reps: null, hold: null, frequency: null, notes: null, ...changes });

describe("doseLines", () => {
  it("writes the dose out in full", () => {
    expect(doseLines(exercise({ sets: 3, reps: "10", hold: "5 δευτερόλεπτα", frequency: "2 φορές τη μέρα" }))).toEqual([
      "3 σετ × 10 επαναλήψεις",
      "Κρατήστε 5 δευτερόλεπτα",
      "2 φορές τη μέρα",
    ]);
  });

  it("keeps a duration as the physio said it", () => {
    expect(doseLines(exercise({ sets: 2, reps: "30 δευτερόλεπτα" }))).toEqual(["2 σετ × 30 δευτερόλεπτα"]);
  });

  it("shows whatever part is known, and nothing when nothing is", () => {
    expect(doseLines(exercise({ sets: 3 }))).toEqual(["3 σετ"]);
    expect(doseLines(exercise({ reps: "10" }))).toEqual(["10 επαναλήψεις"]);
    expect(doseLines(exercise({ hold: "  " }))).toEqual([]);
  });
});

describe("missingFields", () => {
  it("lists the sets, reps and frequency the physio didn't say", () => {
    const program = {
      exercises: [exercise({ sets: 3, reps: "10", frequency: "καθημερινά" }), exercise({ reps: " " })],
    } as PatientProgram;
    expect(missingFields(program)).toEqual([
      { exercise: 1, field: "sets" },
      { exercise: 1, field: "reps" },
      { exercise: 1, field: "frequency" },
    ]);
  });
});

describe("formatting", () => {
  it("seconds in Greek, clock as m:ss", () => {
    expect(formatSeconds(1.8)).toBe("1,8 δευτ.");
    expect(formatClock(42.7)).toBe("0:42");
    expect(formatClock(125)).toBe("2:05");
  });

  it("note as text skips empty sections and uses the note's language", () => {
    const note = { patient: "George", body_area: "Left knee", plan: " " } as ClinicalNote;
    expect(noteAsText(note, "en")).toBe("Patient: George\nArea: Left knee");
  });
});

describe("holdSeconds", () => {
  it("reads the hold time the physio said, in digits or words", () => {
    expect(holdSeconds("10 δευτερόλεπτα")).toBe(10);
    expect(holdSeconds("5 δευτ.")).toBe(5);
    expect(holdSeconds("τριάντα δευτερόλεπτα")).toBe(30);
    expect(holdSeconds("1 λεπτό")).toBe(60);
    expect(holdSeconds("ένα λεπτό")).toBe(60);
    expect(holdSeconds("μισό λεπτό")).toBe(30);
    expect(holdSeconds("30 seconds")).toBe(30);
  });

  it("gives no countdown when there is nothing clear to count", () => {
    expect(holdSeconds(null)).toBeNull();
    expect(holdSeconds("  ")).toBeNull();
    expect(holdSeconds("όσο αντέχει")).toBeNull();
    expect(holdSeconds("λίγο")).toBeNull();
  });
});
