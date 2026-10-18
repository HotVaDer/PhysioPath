import { describe, expect, it } from "vitest";

import { draftReducer, emptyDraft, parseDraft, type Draft } from "@/app/lib/draft";
import type { VoiceNoteResult } from "@/app/lib/schema";

const result: VoiceNoteResult = {
  program: {
    patient_first_name: "Γιώργος",
    title: "Πρόγραμμα ασκήσεων – Αριστερό γόνατο",
    exercises: [
      { name: "Γέφυρα", sets: 3, reps: "10", hold: null, frequency: "2 φορές τη μέρα", notes: null },
      { name: "Καθίσματα", sets: null, reps: null, hold: null, frequency: null, notes: null },
    ],
    after_exercises: ["Πάγος 15 λεπτά"],
    avoid: [],
    contact_if: [],
    other: [],
    next_appointment: null,
  },
  note: {
    patient: "Γιώργος",
    body_area: "Αριστερό γόνατο",
    stage: null,
    subjective: null,
    objective: null,
    treatment_today: null,
    home_program: null,
    precautions: null,
    plan: null,
  },
  missing_or_unclear: ["Πόσα σετ για τα καθίσματα;"],
};

const withResult: Draft = draftReducer(emptyDraft, { type: "generated", result, seconds: 12.3, noteLang: "el" });
const exercises = (draft: Draft) => draft.result!.program.exercises;

describe("draftReducer: before there's a result", () => {
  it("a recording replaces the text and the timings", () => {
    const draft = draftReducer({ ...emptyDraft, timings: { generate: 9 } }, { type: "transcribed", text: "Γεια", fixes: [], seconds: 1.8, recordingSeconds: 42 });
    expect(draft.transcript).toBe("Γεια");
    expect(draft.timings).toEqual({ recording: 42, transcribe: 1.8 });
  });

  it("keeps the proofreader's fixes, and undo puts the heard word back", () => {
    const fixes = [{ heard: "εχείρηση", corrected: "εγχείρηση" }];
    const draft = draftReducer(emptyDraft, { type: "transcribed", text: "Έκανε την εγχείρηση.", fixes, seconds: 2, proofreadSeconds: 1.1 });
    expect(draft.fixes).toEqual(fixes);
    expect(draft.timings.proofread).toBe(1.1);
    const undone = draftReducer(draft, { type: "undoFix", index: 0 });
    expect(undone.transcript).toBe("Έκανε την εχείρηση.");
    expect(undone.fixes).toEqual([]);
  });

  it("a sample clears the fixes", () => {
    const draft = { ...emptyDraft, fixes: [{ heard: "α", corrected: "β" }] };
    expect(draftReducer(draft, { type: "pickSample", text: "Δείγμα" }).fixes).toEqual([]);
  });

  it("a sample clears the timings; typing keeps them", () => {
    const timed = { ...emptyDraft, timings: { transcribe: 2 } };
    expect(draftReducer(timed, { type: "pickSample", text: "Δείγμα" }).timings).toEqual({});
    expect(draftReducer(timed, { type: "typeTranscript", text: "Δείγμα" }).timings).toEqual({ transcribe: 2 });
  });

  it("edits do nothing without a result", () => {
    expect(draftReducer(emptyDraft, { type: "addExercise" })).toBe(emptyDraft);
  });

  it("a new result stores the language and how long Claude took", () => {
    expect(withResult.resultNoteLang).toBe("el");
    expect(withResult.timings.generate).toBe(12.3);
  });
});

describe("draftReducer: editing the program", () => {
  it("an emptied optional field becomes null (= not said), but the title stays text", () => {
    expect(draftReducer(withResult, { type: "setProgramText", field: "patient_first_name", value: "" }).result!.program.patient_first_name).toBeNull();
    expect(draftReducer(withResult, { type: "setProgramText", field: "title", value: "" }).result!.program.title).toBe("");
  });

  it("text is kept as typed, spaces included", () => {
    const draft = draftReducer(withResult, { type: "setExercise", index: 0, field: "notes", value: "Αργά " });
    expect(exercises(draft)[0].notes).toBe("Αργά ");
  });

  it("sets are whole positive numbers; anything else means not said", () => {
    const set = (value: string) => exercises(draftReducer(withResult, { type: "setExercise", index: 1, field: "sets", value }))[1].sets;
    expect(set("4")).toBe(4);
    expect(set("")).toBeNull();
    expect(set("0")).toBeNull();
    expect(set("τρία")).toBeNull();
  });

  it("edits only the exercise asked for", () => {
    const draft = draftReducer(withResult, { type: "setExercise", index: 1, field: "reps", value: "8" });
    expect(exercises(draft)[1].reps).toBe("8");
    expect(exercises(draft)[0]).toBe(exercises(withResult)[0]);
  });

  it("adds an empty exercise at the end", () => {
    const draft = draftReducer(withResult, { type: "addExercise" });
    expect(exercises(draft)).toHaveLength(3);
    expect(exercises(draft)[2]).toEqual({ name: "", sets: null, reps: null, hold: null, frequency: null, notes: null });
  });

  it("removing an exercise can be undone, back in the same place", () => {
    const removed = draftReducer(withResult, { type: "removeExercise", index: 0 });
    expect(exercises(removed).map((e) => e.name)).toEqual(["Καθίσματα"]);
    expect(removed.removed?.exercise.name).toBe("Γέφυρα");

    const undone = draftReducer(removed, { type: "undoRemove" });
    expect(exercises(undone).map((e) => e.name)).toEqual(["Γέφυρα", "Καθίσματα"]);
    expect(undone.removed).toBeNull();
  });

  it("replaces a list and edits the note", () => {
    const listed = draftReducer(withResult, { type: "setProgramList", field: "avoid", items: ["Σκάλες"] });
    expect(listed.result!.program.avoid).toEqual(["Σκάλες"]);
    const noted = draftReducer(withResult, { type: "setNote", field: "plan", value: "Επανεκτίμηση σε 2 εβδομάδες" });
    expect(noted.result!.note.plan).toBe("Επανεκτίμηση σε 2 εβδομάδες");
  });

  it("reset starts over but keeps the note language choice", () => {
    const draft = draftReducer({ ...withResult, noteLang: "en" }, { type: "reset" });
    expect(draft).toEqual({ ...emptyDraft, noteLang: "en" });
  });
});

describe("parseDraft", () => {
  it("reads back a saved draft", () => {
    expect(parseDraft(JSON.stringify(withResult))).toEqual(withResult);
  });

  it("ignores missing, broken or outdated drafts", () => {
    expect(parseDraft(null)).toBeNull();
    expect(parseDraft("{not json")).toBeNull();
    expect(parseDraft(JSON.stringify({ transcript: 5 }))).toBeNull();
  });
});
