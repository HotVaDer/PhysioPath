// «Πείτε τα πρότυπά σας»: the rules of the page's state (recordings appended, cards from the AI without a
// patient, edits, saved cards fixed) and the checks before «Αποθήκευση».
import { describe, expect, it } from "vitest";

import type { DictatedTemplate, PatientProgram } from "@/app/lib/notes/schema";
import {
  cardProblem,
  dictationReducer,
  emptyDictation,
  isDictationStale,
  nameKey,
  nameTaken,
  parseDictation,
  sideOf,
  type Dictation,
} from "@/app/lib/templates/dictation";

const program: PatientProgram = {
  title: "Πρόγραμμα ασκήσεων – Γόνατο",
  patient_first_name: "Γιώργος", // the AI was told not to; the page clears it anyway
  next_appointment: "Πέμπτη",
  exercises: [
    { name: "Ανυψώσεις τεντωμένου ποδιού", sets: 3, reps: "10", hold: null, frequency: "2 φορές τη μέρα", notes: null },
    { name: "Γλίστρημα φτέρνας", sets: 2, reps: "15", hold: null, frequency: null, notes: null },
  ],
  after_exercises: ["Πάγος 15 λεπτά."],
  avoid: [],
  contact_if: [],
  other: [],
};
const knee: DictatedTemplate = { name: "Γόνατο μετά ACL – εβδ. 1", area: "Γόνατο", program, questions: ["Πόσο συχνά το γλίστρημα φτέρνας;"] };
const shoulder: DictatedTemplate = { name: "Ώμος – κινητικότητα", area: null, program: { ...program, title: "Ώμος" }, questions: [] };

const withCards = (): Dictation =>
  dictationReducer(
    { ...emptyDictation, transcript: "Πρώτο… Δεύτερο…" },
    { type: "generated", result: { templates: [knee, shoulder], missing_or_unclear: ["Γενική ερώτηση"] }, transcript: "Πρώτο… Δεύτερο…", keys: ["k1", "k2"] },
  );

describe("dictationReducer", () => {
  it("each recording's text goes after the text already there", () => {
    let s = dictationReducer(emptyDictation, { type: "heard", text: " Πρώτο, γόνατο. " });
    expect(s.transcript).toBe("Πρώτο, γόνατο.");
    s = dictationReducer(s, { type: "heard", text: "Δεύτερο, ώμος." });
    expect(s.transcript).toBe("Πρώτο, γόνατο.\n\nΔεύτερο, ώμος.");
    expect(dictationReducer(s, { type: "heard", text: "  " })).toBe(s); // nothing heard: nothing changes
  });

  it("the AI's templates become cards, never with a patient; the general questions are kept", () => {
    const s = withCards();
    expect(s.cards.map((c) => [c.key, c.name, c.area])).toEqual([
      ["k1", "Γόνατο μετά ACL – εβδ. 1", "Γόνατο"],
      ["k2", "Ώμος – κινητικότητα", ""],
    ]);
    expect(s.cards[0].program.patient_first_name).toBeNull();
    expect(s.cards[0].program.next_appointment).toBeNull();
    expect(s.cards[0].questions).toEqual(["Πόσο συχνά το γλίστρημα φτέρνας;"]);
    expect(s.general).toEqual(["Γενική ερώτηση"]);
    expect(s.resultTranscript).toBe("Πρώτο… Δεύτερο…");
  });

  it("edits change only their card, and clear the card's last refusal", () => {
    let s = dictationReducer(withCards(), { type: "failed", key: "k1", error: "taken" });
    s = dictationReducer(s, { type: "setText", key: "k1", field: "name", value: "Γόνατο ACL 1" });
    expect(s.cards[0].name).toBe("Γόνατο ACL 1");
    expect(s.cards[0].error).toBeNull();
    s = dictationReducer(s, { type: "setExercise", key: "k1", index: 1, field: "sets", value: "4" });
    s = dictationReducer(s, { type: "setExercise", key: "k1", index: 1, field: "frequency", value: "" });
    expect(s.cards[0].program.exercises[1]).toMatchObject({ sets: 4, frequency: null });
    s = dictationReducer(s, { type: "removeExercise", key: "k1", index: 0 });
    s = dictationReducer(s, { type: "addExercise", key: "k1" });
    expect(s.cards[0].program.exercises.map((e) => e.name)).toEqual(["Γλίστρημα φτέρνας", ""]);
    s = dictationReducer(s, { type: "setList", key: "k1", field: "avoid", items: ["Όχι γονάτισμα"] });
    s = dictationReducer(s, { type: "setText", key: "k1", field: "title", value: "Γόνατο" });
    expect(s.cards[0].program).toMatchObject({ avoid: ["Όχι γονάτισμα"], title: "Γόνατο" });
    expect(s.cards[1]).toEqual(withCards().cards[1]);
  });

  it("a saved card can't be changed any more; it can still be dropped from the page", () => {
    let s = dictationReducer(withCards(), { type: "saved", key: "k1", id: "5eed0000-0000-4000-8000-0000000000d1" });
    expect(dictationReducer(s, { type: "setText", key: "k1", field: "name", value: "Άλλο" })).toBe(s);
    expect(dictationReducer(s, { type: "failed", key: "k1", error: "failed" })).toBe(s);
    s = dictationReducer(s, { type: "dropCard", key: "k1" });
    expect(s.cards.map((c) => c.key)).toEqual(["k2"]);
  });

  it("new cards replace the old ones; «Νέα υπαγόρευση» empties the page but keeps who and where", () => {
    let s = dictationReducer(withCards(), { type: "stamp", userId: "u1", clinicId: "c1" });
    s = dictationReducer(s, { type: "generated", result: { templates: [shoulder], missing_or_unclear: [] }, transcript: "Ώμος", keys: ["k3"] });
    expect(s.cards.map((c) => c.key)).toEqual(["k3"]);
    expect(dictationReducer(s, { type: "reset" })).toEqual({ ...emptyDictation, userId: "u1", clinicId: "c1" });
  });
});

describe("isDictationStale", () => {
  it("only when the text changed after the cards were made (spaces at the ends don't count)", () => {
    const s = withCards();
    expect(isDictationStale(s)).toBe(false);
    expect(isDictationStale(dictationReducer(s, { type: "typeTranscript", text: " Πρώτο… Δεύτερο… \n" }))).toBe(false);
    expect(isDictationStale(dictationReducer(s, { type: "heard", text: "Τρίτο…" }))).toBe(true);
    expect(isDictationStale({ ...emptyDictation, transcript: "x" })).toBe(false); // no cards yet
  });
});

describe("cardProblem and nameTaken", () => {
  it("a name, an area of up to 60 characters, 1 to 40 exercises with a name, sets up to 99", () => {
    const [card] = withCards().cards;
    expect(cardProblem(card)).toBeNull();
    expect(cardProblem({ ...card, name: "   " })).toBe("badname");
    expect(cardProblem({ ...card, name: "α".repeat(81) })).toBe("badname");
    expect(cardProblem({ ...card, area: "α".repeat(61) })).toBe("badarea");
    const noNames = card.program.exercises.map((e) => ({ ...e, name: " " }));
    expect(cardProblem({ ...card, program: { ...card.program, exercises: noNames } })).toBe("badprogram");
    const tooMany = { ...card.program.exercises[0], sets: 100 };
    expect(cardProblem({ ...card, program: { ...card.program, exercises: [tooMany] } })).toBe("badprogram");
  });

  it("warns about a name in the library or saved on another card (spaces and capitals don't count)", () => {
    const s = withCards();
    const [knee, shoulder] = s.cards;
    expect(nameTaken(knee, new Set([nameKey("γόνατο  μετά ACL – ΕΒΔ. 1")]), s.cards)).toBe(true);
    expect(nameTaken(knee, new Set(), s.cards)).toBe(false);
    const savedTwin = { ...shoulder, name: knee.name, savedId: "5eed0000-0000-4000-8000-0000000000d2" };
    expect(nameTaken(knee, new Set(), [knee, savedTwin])).toBe(true);
    expect(nameTaken(knee, new Set(), [knee, { ...savedTwin, savedId: null }])).toBe(false); // not saved: no clash yet
  });
});

describe("parseDictation", () => {
  it("reads back a saved state, and ignores anything broken", () => {
    const s = withCards();
    expect(parseDictation(JSON.stringify(s))).toEqual(s);
    expect(parseDictation("{not json")).toBeNull();
    expect(parseDictation(JSON.stringify({ transcript: 1 }))).toBeNull();
    expect(parseDictation(null)).toBeNull();
  });
});

describe("«Αλλαγή με φωνή»: applied", () => {
  it("rewrites the card's program (never with a patient), keeps its name and area unless said, and remembers the result", () => {
    const start = withCards();
    const changed = { ...program, exercises: [program.exercises[0]] };
    let s = dictationReducer(start, { type: "applied", key: "k1", program: changed, name: null, area: null, questions: ["Ποια άσκηση;"], transcript: "Βγάλε το γλίστρημα" });
    expect(s.cards[0]).toMatchObject({ name: "Γόνατο μετά ACL – εβδ. 1", area: "Γόνατο", questions: ["Ποια άσκηση;"] });
    expect(s.cards[0].program.exercises).toHaveLength(1);
    expect(s.cards[0].program).toMatchObject({ patient_first_name: null, next_appointment: null });
    expect(s.resultTranscript).toBe("Βγάλε το γλίστρημα");
    expect(s.applied).toBe(sideOf(s.cards[0]));
    expect(s.cards[1]).toEqual(start.cards[1]);
    s = dictationReducer(s, { type: "applied", key: "k1", program: changed, name: "Γόνατο εβδ. 3", area: "Γόνατο δεξί", questions: [], transcript: "x" });
    expect(s.cards[0]).toMatchObject({ name: "Γόνατο εβδ. 3", area: "Γόνατο δεξί" });
    // an edit by hand afterwards: the card no longer matches what was applied
    s = dictationReducer(s, { type: "setText", key: "k1", field: "title", value: "Άλλο" });
    expect(sideOf(s.cards[0])).not.toBe(s.applied);
  });
});

