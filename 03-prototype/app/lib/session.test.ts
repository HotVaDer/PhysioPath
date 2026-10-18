import { describe, expect, it } from "vitest";

import type { ClinicalNote, Exercise, PatientProgram } from "@/app/lib/schema";
import {
  applyPatientAction,
  boardStatus,
  clearCall,
  currentExercise,
  exercisesDone,
  finishSession,
  patientView,
  startSession,
  type Session,
} from "@/app/lib/session";

const exercise = (name: string, sets: number | null): Exercise => ({ name, sets, reps: "10", hold: null, frequency: null, notes: null });
const program: PatientProgram = {
  patient_first_name: "Ελένη",
  title: "Δεξιός ώμος",
  exercises: [exercise("Pendulum", null), exercise("Wall slides", 2), exercise("   ", 3)],
  after_exercises: [],
  avoid: [],
  contact_if: [],
  other: [],
  next_appointment: null,
};
const note = { patient: "Ελένη", plan: "Επανεκτίμηση σε 1 εβδομάδα" } as ClinicalNote;
const T0 = "2026-10-18T10:00:00.000Z";
const T1 = "2026-10-18T10:01:00.000Z";
const start = () => startSession(program, note, "2026-10-18-abc12345", T0);
const act = (s: Session, ...actions: Parameters<typeof applyPatientAction>[1][]) => actions.reduce((acc, a) => applyPatientAction(acc, a, T1), s);

describe("startSession", () => {
  it("drops exercises without a name and starts every count at 0", () => {
    const session = start();
    expect(session.program.exercises.map((e) => e.name)).toEqual(["Pendulum", "Wall slides"]);
    expect(session.setsDone).toEqual([0, 0]);
    expect(currentExercise(session)).toBe(0);
    expect(boardStatus(session)).toBe("working");
  });
});

describe("applyPatientAction", () => {
  it("moves on to the next exercise when the sets are done (no sets said = one go)", () => {
    const session = act(start(), { type: "setDone", exercise: 0, set: 1 });
    expect(session.setsDone).toEqual([1, 0]);
    expect(currentExercise(session)).toBe(1);
    expect(session.updatedAt).toBe(T1);
  });

  it("counts a set once, even if the same tap arrives twice", () => {
    const session = act(start(), { type: "setDone", exercise: 0, set: 1 }, { type: "setDone", exercise: 1, set: 1 }, { type: "setDone", exercise: 1, set: 1 });
    expect(session.setsDone).toEqual([1, 1]);
  });

  it("never counts more sets than the physio said", () => {
    const session = act(start(), { type: "setDone", exercise: 0, set: 1 }, { type: "setDone", exercise: 0, set: 2 });
    expect(session.setsDone).toEqual([1, 0]);
  });

  it("finishes when every exercise is done, and undo goes back", () => {
    const done = act(start(), { type: "setDone", exercise: 0, set: 1 }, { type: "setDone", exercise: 1, set: 1 }, { type: "setDone", exercise: 1, set: 2 });
    expect(currentExercise(done)).toBe(-1);
    expect(exercisesDone(done)).toBe(2);
    expect(boardStatus(done)).toBe("done");
    const undone = act(done, { type: "undoSet", exercise: 1 });
    expect(undone.setsDone).toEqual([1, 1]);
    expect(boardStatus(undone)).toBe("working");
    expect(act(start(), { type: "undoSet", exercise: 0 }).setsDone).toEqual([0, 0]); // nothing to undo
  });

  it("a call shows on the board until the physio or the patient clears it", () => {
    const calling = act(start(), { type: "call", reason: "pain" });
    expect(calling.call).toEqual({ reason: "pain", at: T1 });
    expect(boardStatus(calling)).toBe("needs-you");
    expect(clearCall(calling, T1).call).toBeNull();
    expect(act(calling, { type: "cancelCall" }).call).toBeNull();
  });

  it("changes nothing once the physio has closed the session", () => {
    const closed = finishSession(act(start(), { type: "call", reason: "question" }), "2026-10-18-home1234", T1);
    expect(closed.call).toBeNull();
    expect(act(closed, { type: "setDone", exercise: 0, set: 1 })).toBe(closed);
  });
});

describe("patientView", () => {
  it("never includes the clinical note", () => {
    const view = patientView(start());
    expect(view).not.toHaveProperty("note");
    expect(JSON.stringify(view)).not.toContain("Επανεκτίμηση");
    expect(view.program.title).toBe("Δεξιός ώμος");
  });
});
