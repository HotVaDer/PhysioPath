import { describe, expect, it } from "vitest";

import {
  allDone,
  boardStatus,
  exercisesDone,
  minutesAgo,
  nowExercise,
  PatientAction,
  readPatientView,
  undoExercise,
} from "@/app/lib/board/session";

const program = (names: string[]) => ({
  version: 1,
  patient_first_name: null,
  title: "Γόνατο",
  exercises: names.map((name) => ({ name, sets: 3, reps: "10", hold: null, frequency: null, notes: null })),
  after_exercises: [],
  avoid: [],
  contact_if: [],
  other: [],
  next_appointment: null,
});

// What patient_session() returns for a card with 3 exercises.
const fromDatabase = (over: Record<string, unknown> = {}) => ({
  program: program(["Γέφυρα", "Καθίσματα", "Βάδιση"]),
  setsTarget: [3, 3, 1],
  setsDone: [0, 0, 0],
  current: 0,
  call: null,
  finishedAt: null,
  homeToken: null,
  clinicName: "Κλινική Α",
  updatedAt: "2026-11-18T10:00:00+00:00",
  ...over,
});

describe("readPatientView", () => {
  it("reads what the database sends", () => {
    const view = readPatientView(fromDatabase({ call: { reason: "pain", at: "2026-11-18T10:01:00+00:00" } }));
    expect(view?.program.exercises.map((e) => e.name)).toEqual(["Γέφυρα", "Καθίσματα", "Βάδιση"]);
    expect(view?.call?.reason).toBe("pain");
  });

  it("refuses a wrong token (null) and anything that doesn't fit", () => {
    expect(readPatientView(null)).toBeNull();
    expect(readPatientView(fromDatabase({ setsDone: [0, 0] }))).toBeNull(); // arrays disagree
    expect(readPatientView(fromDatabase({ setsTarget: [3, 3], setsDone: [0, 0] }))).toBeNull(); // program has 3
    expect(readPatientView(fromDatabase({ current: 3 }))).toBeNull();
    expect(readPatientView(fromDatabase({ call: { reason: "boom", at: "x" } }))).toBeNull();
    expect(readPatientView(fromDatabase({ program: { ...program(["Γέφυρα"]), version: 2 } }))).toBeNull();
  });
});

describe("progress", () => {
  const p = (setsDone: number[], current = 0) => ({ setsTarget: [3, 3, 1], setsDone, current });

  it("counts whole exercises only", () => {
    expect(exercisesDone(p([3, 2, 0]))).toBe(1);
    expect(allDone(p([3, 3, 1]))).toBe(true);
  });

  it("«τώρα» is the exercise the patient is on, even after a jump", () => {
    expect(nowExercise(p([0, 0, 0], 2))).toBe(2);
    expect(nowExercise(p([1, 0, 0], 1))).toBe(1);
  });

  it("an exercise already done moves «τώρα» to the first one not done; -1 when all are done", () => {
    expect(nowExercise(p([3, 1, 1], 2))).toBe(1);
    expect(nowExercise(p([3, 3, 1], 2))).toBe(-1);
  });

  it("«Αναίρεση» takes back the exercise on screen, or the one just finished before it", () => {
    expect(undoExercise(p([1, 2, 0]), 1)).toBe(1);
    expect(undoExercise(p([3, 0, 0]), 1)).toBe(0);
    expect(undoExercise(p([3, 3, 1]), -1)).toBe(2);
    expect(undoExercise(p([0, 0, 0]), 0)).toBe(-1);
  });
});

describe("boardStatus", () => {
  const base = { setsTarget: [1], setsDone: [1], current: 0 };
  it("a call comes first, even when everything is done", () => {
    expect(boardStatus({ ...base, call: { reason: "question", at: "2026-11-18T10:00:00Z" } })).toBe("calling");
    expect(boardStatus({ ...base, call: null })).toBe("done");
    expect(boardStatus({ ...base, setsDone: [0], call: null })).toBe("working");
  });
});

describe("minutesAgo", () => {
  const now = "2026-11-18T10:30:00Z";
  it("says it in words", () => {
    expect(minutesAgo("2026-11-18T10:29:30Z", now)).toBe("μόλις τώρα");
    expect(minutesAgo("2026-11-18T10:29:00Z", now)).toBe("πριν από 1 λεπτό");
    expect(minutesAgo("2026-11-18T10:18:00Z", now)).toBe("πριν από 12 λεπτά");
  });
  it("a clock a little ahead or a bad date is «μόλις τώρα»", () => {
    expect(minutesAgo("2026-11-18T10:31:00Z", now)).toBe("μόλις τώρα");
    expect(minutesAgo("not a date", now)).toBe("μόλις τώρα");
  });
});

describe("PatientAction", () => {
  it("lets through only what patient_action() understands", () => {
    expect(PatientAction.safeParse({ type: "setDone", exercise: 0, set: 1 }).success).toBe(true);
    expect(PatientAction.safeParse({ type: "show", exercise: 2 }).success).toBe(true);
    expect(PatientAction.safeParse({ type: "call", reason: "pain" }).success).toBe(true);
    expect(PatientAction.safeParse({ type: "setDone", exercise: -1, set: 1 }).success).toBe(false);
    expect(PatientAction.safeParse({ type: "call", reason: "boom" }).success).toBe(false);
    expect(PatientAction.safeParse({ type: "finish" }).success).toBe(false); // only staff press «Τέλος»
  });
});
