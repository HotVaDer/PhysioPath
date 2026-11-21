import { describe, expect, it } from "vitest";

import { draftReducer, emptyDraft, isStale, noteFor, parseDraft, type Draft } from "@/app/lib/notes/draft";
import type { VoiceNoteResult } from "@/app/lib/notes/schema";

const DRAFT_ID = "5b3c0d6e-8f41-4a2b-9c7d-1e2f3a4b5c6d";

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
    patient_ref: "Γιώργος",
    body_area: "Αριστερό γόνατο",
    service_given: null,
    assessment_findings: null,
    treatment_plan: null,
    progress: null,
  },
  missing_or_unclear: ["Πόσα σετ για τα καθίσματα;"],
};

const withResult: Draft = draftReducer(emptyDraft, { type: "generated", result, seconds: 12.3, noteLang: "el", draftId: DRAFT_ID });
const exercises = (draft: Draft) => draft.result!.program.exercises;

describe("draftReducer: before there's a result", () => {
  it("a recording replaces the text and the timings", () => {
    const draft = draftReducer({ ...emptyDraft, timings: { generate: 9 } }, { type: "transcribed", text: "Γεια", seconds: 1.8, recordingSeconds: 42 });
    expect(draft.transcript).toBe("Γεια");
    expect(draft.timings).toEqual({ recording: 42, transcribe: 1.8 });
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
    const noted = draftReducer(withResult, { type: "setNote", field: "treatment_plan", value: "Επανεκτίμηση σε 2 εβδομάδες" });
    expect(noted.result!.note.treatment_plan).toBe("Επανεκτίμηση σε 2 εβδομάδες");
  });

  it("a new result gets the id that makes approving it twice harmless", () => {
    expect(withResult.draftId).toBe(DRAFT_ID);
  });

  it("keeps who it is for, the activity code and where, until reset", () => {
    let draft = draftReducer(withResult, { type: "setPatient", patient: { id: null, label: "Γιώργος" } });
    draft = draftReducer(draft, { type: "setActivityCode", code: "PHYS02" });
    draft = draftReducer(draft, { type: "setWhere", where: "home" });
    expect([draft.patient, draft.activityCode, draft.where]).toEqual([{ id: null, label: "Γιώργος" }, "PHYS02", "home"]);
    expect(draftReducer(draft, { type: "reset" }).activityCode).toBeNull();
  });

  it("«Ίδιο πρόγραμμα»: keeps the stored program; another choice or another patient clears what was generated", () => {
    const ELENI = "5b0b6c1e-1a2b-4c3d-8e9f-0a1b2c3d4e5f";
    const base = { programId: "6c1c7d2f-2b3c-4d4e-9f0a-1b2c3d4e5f60", approvedAt: "2026-11-12T10:00:00Z", program: withResult.result!.program };
    let draft = draftReducer(withResult, { type: "setPatient", patient: { id: ELENI, label: "Ελένη Κ." } });
    expect([draft.result, draft.mode]).toEqual([null, "new"]); // another patient: the old result is gone
    draft = draftReducer({ ...draft, transcript: "Σήμερα μάλαξη." }, { type: "setMode", mode: "same", base });
    expect([draft.mode, draft.base?.programId, draft.transcript]).toEqual(["same", base.programId, "Σήμερα μάλαξη."]);
    const generated = draftReducer(draft, { type: "generated", result: { ...withResult.result!, program: base.program }, seconds: 3, noteLang: "el", draftId: DRAFT_ID });
    expect(draftReducer(generated, { type: "setMode", mode: "same", base })).toBe(generated); // same choice again: nothing lost
    const changed = draftReducer(generated, { type: "setMode", mode: "new", base: null });
    expect([changed.mode, changed.base, changed.result, changed.transcript]).toEqual(["new", null, null, "Σήμερα μάλαξη."]);
    // Typing a new patient's name doesn't clear anything (the patient is still "new").
    const typed = draftReducer({ ...withResult, patient: { id: null, label: "Γ" } }, { type: "setPatient", patient: { id: null, label: "Γι" } });
    expect(typed.result).toBe(withResult.result);
  });

  it("reset starts over but keeps the note language choice", () => {
    const draft = draftReducer({ ...withResult, noteLang: "en" }, { type: "reset" });
    expect(draft).toEqual({ ...emptyDraft, noteLang: "en" });
  });
});

describe("draftReducer: a slow answer for someone else", () => {
  const forMaria = { ...emptyDraft, patient: { id: null, label: "Μαρία" } };
  const forNikos = draftReducer(forMaria, { type: "setPatient", patient: { id: null, label: "Νίκος" } });
  const startedFor = noteFor(forMaria);

  it("a program made for Μαρία, arriving after the physio picked Νίκος, is thrown away", () => {
    const late = draftReducer(forNikos, { type: "generated", result, seconds: 20, noteLang: "el", draftId: DRAFT_ID, startedFor });
    expect(late).toBe(forNikos);
    expect(late.result).toBeNull();
  });

  it("the same for a recording's text", () => {
    const late = draftReducer(forNikos, { type: "transcribed", text: "Για τη Μαρία", seconds: 3, startedFor });
    expect(late.transcript).toBe("");
  });

  it("switching between new program and «Ίδιο πρόγραμμα» meanwhile also counts as someone else", () => {
    const base = { programId: "6b3c0d6e-8f41-4a2b-9c7d-1e2f3a4b5c6d", approvedAt: "2026-11-01T10:00:00Z", program: result.program };
    const same = draftReducer(forMaria, { type: "setMode", mode: "same", base });
    const late = draftReducer(same, { type: "generated", result, seconds: 20, noteLang: "el", draftId: DRAFT_ID, startedFor });
    expect(late.result).toBeNull();
  });

  it("an answer for the note on screen goes in as always", () => {
    const fine = draftReducer(forMaria, { type: "generated", result, seconds: 20, noteLang: "el", draftId: DRAFT_ID, startedFor });
    expect(fine.result).toEqual(result);
    expect(draftReducer(forMaria, { type: "transcribed", text: "Γεια", seconds: 2, startedFor }).transcript).toBe("Γεια");
  });
});

describe("isStale: the text changed after the program was made", () => {
  const typed = draftReducer(emptyDraft, { type: "typeTranscript", text: "Γέφυρα 3 σετ" });
  const made = draftReducer(typed, { type: "generated", result, seconds: 20, noteLang: "el", draftId: DRAFT_ID, transcript: "Γέφυρα 3 σετ" });

  it("right after the program is made, it matches its text", () => {
    expect(made.resultTranscript).toBe("Γέφυρα 3 σετ");
    expect(isStale(made)).toBe(false);
  });

  it("typing, a new recording or an example afterwards makes it stale", () => {
    expect(isStale(draftReducer(made, { type: "typeTranscript", text: "Γέφυρα 5 σετ" }))).toBe(true);
    expect(isStale(draftReducer(made, { type: "transcribed", text: "Άλλη ηχογράφηση", seconds: 2 }))).toBe(true);
    expect(isStale(draftReducer(made, { type: "pickSample", text: "Δείγμα" }))).toBe(true);
  });

  it("a space or a new line at the end doesn't count", () => {
    expect(isStale(draftReducer(made, { type: "typeTranscript", text: "Γέφυρα 3 σετ \n" }))).toBe(false);
  });

  it("the text the program was made from is the one that was sent, even if typing went on meanwhile", () => {
    const meanwhile = draftReducer(typed, { type: "typeTranscript", text: "Γέφυρα 3 σετ, και πάγος" });
    const late = draftReducer(meanwhile, { type: "generated", result, seconds: 20, noteLang: "el", draftId: DRAFT_ID, transcript: "Γέφυρα 3 σετ" });
    expect(isStale(late)).toBe(true);
  });

  it("«Κράτα αυτό»: the physio keeps it, so it's no longer stale", () => {
    const changed = draftReducer(made, { type: "typeTranscript", text: "Γέφυρα 5 σετ" });
    const kept = draftReducer(changed, { type: "keepResult" });
    expect(isStale(kept)).toBe(false);
    expect(kept.result).toEqual(result);
  });

  it("a draft saved before this change (no text kept) is never called stale", () => {
    expect(isStale({ ...made, resultTranscript: null, transcript: "κάτι άλλο" })).toBe(false);
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

describe("draftReducer: the clinic a note belongs to", () => {
  const A = "11111111-1111-4111-8111-111111111111";
  const B = "22222222-2222-4222-8222-222222222222";

  it("is stamped once: a note keeps the clinic it was started in", () => {
    const inA = draftReducer(emptyDraft, { type: "stampClinic", clinicId: A });
    expect(inA.clinicId).toBe(A);
    // Clinic B opened meanwhile (maybe in another tab): the note is still clinic A's.
    expect(draftReducer(inA, { type: "stampClinic", clinicId: B }).clinicId).toBe(A);
  });

  it("a new note («reset») is free again, for the clinic open then", () => {
    const inA = draftReducer(emptyDraft, { type: "stampClinic", clinicId: A });
    const fresh = draftReducer(inA, { type: "reset" });
    expect(fresh.clinicId).toBeNull();
    expect(draftReducer(fresh, { type: "stampClinic", clinicId: B }).clinicId).toBe(B);
  });

  it("choosing the patient makes the note the open clinic's (bug: a leftover stamp refused it)", () => {
    // A note from clinic A was left in this tab; clinic B is open now and a B patient is chosen.
    const leftover = draftReducer({ ...emptyDraft, transcript: "παλιά σημείωση" }, { type: "stampClinic", clinicId: A });
    const chosen = draftReducer(leftover, { type: "setPatient", patient: { id: null, label: "Νίκος" } });
    expect(chosen.clinicId).toBeNull(); // DraftProvider stamps the open clinic right away
    expect(draftReducer(chosen, { type: "stampClinic", clinicId: B }).clinicId).toBe(B);
    // The same with an existing patient picked from the list.
    const picked = draftReducer(leftover, { type: "setPatient", patient: { id: B, label: "Ελένη" } });
    expect(draftReducer(picked, { type: "stampClinic", clinicId: B }).clinicId).toBe(B);
  });

  it("an older saved draft (from before clinics were stamped) still reads, without a clinic", () => {
    const { clinicId: _, ...old } = emptyDraft;
    expect(parseDraft(JSON.stringify(old))?.clinicId).toBeNull();
  });
});
