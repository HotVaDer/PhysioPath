// «Πείτε τα πρότυπά σας» (/templates/dictate): the physio's work in progress. The text of one or more
// recordings, the templates the AI split it into (one card each), the physio's edits, and which cards are
// saved. Nothing reaches the library until the physio presses «Αποθήκευση» on a card (createTemplate).
// One reducer holds every rule, as for the voice note (app/lib/notes/draft.ts); DictateForm keeps the state
// in sessionStorage, so a refresh loses nothing. Pure: no React, no server code.
import * as z from "zod";

import { cleanProgram } from "@/app/lib/notes/approval";
import { emptyExercise, exerciseValue, type ProgramListField } from "@/app/lib/notes/draft";
import { Exercise, PatientProgram, type TemplatesResult } from "@/app/lib/notes/schema";

// The same limits as the database (templates.name, templates.area); load.ts has them for the server pages.
const NAME_MAX = 80;
const AREA_MAX = 60;

// Why a card was not saved. The database says the same in its own words (actions.ts → createTemplate).
export const CardError = z.enum(["taken", "badname", "badarea", "badprogram", "full", "stale", "failed"]);
export type CardError = z.infer<typeof CardError>;

export const CARD_ERRORS: Record<CardError, string> = {
  taken: "Υπάρχει ήδη πρότυπο με αυτό το όνομα. Δώστε άλλο όνομα.",
  badname: `Γράψτε ένα όνομα, έως ${NAME_MAX} χαρακτήρες.`,
  badarea: `Η περιοχή έως ${AREA_MAX} χαρακτήρες.`,
  badprogram: "Χρειάζεται τουλάχιστον μία άσκηση με όνομα (έως 40), και σετ από 1 έως 99.",
  full: "Η βιβλιοθήκη έχει ήδη 300 πρότυπα. Αρχειοθετήστε όσα δεν χρειάζεστε και δοκιμάστε ξανά.",
  stale: "Στο μεταξύ ανοίξατε άλλη κλινική. Ανοίξτε ξανά αυτή την κλινική για να αποθηκεύσετε.",
  failed: "Δεν αποθηκεύτηκε. Δοκιμάστε ξανά σε λίγο.",
};

export const DictatedCard = z.object({
  key: z.string(), // this card's own id on the page (not the template's)
  name: z.string(),
  area: z.string(),
  program: PatientProgram,
  questions: z.array(z.string()), // the AI's questions about this template
  savedId: z.uuid().nullable(), // saved: the template's id in the library, and the card can't change any more
  error: CardError.nullable(), // the last «Αποθήκευση» was refused for this
});
export type DictatedCard = z.infer<typeof DictatedCard>;

// Also checks a state read back from sessionStorage: anything that doesn't fit is thrown away.
export const Dictation = z.object({
  userId: z.string().nullable(), // who and which clinic it belongs to: another person or clinic never sees it
  clinicId: z.string().nullable(),
  transcript: z.string(),
  cards: z.array(DictatedCard),
  general: z.array(z.string()), // the AI's questions about the dictation as a whole
  resultTranscript: z.string().nullable(), // the text the cards were made from (see isDictationStale)
});
export type Dictation = z.infer<typeof Dictation>;

export const emptyDictation: Dictation = { userId: null, clinicId: null, transcript: "", cards: [], general: [], resultTranscript: null };

export type CardTextField = "name" | "area" | "title";

export type DictationAction =
  | { type: "restore"; state: Dictation }
  | { type: "stamp"; userId: string; clinicId: string }
  | { type: "typeTranscript"; text: string }
  | { type: "heard"; text: string } // one more recording: its text goes after what is there
  | { type: "pickSample"; text: string }
  | { type: "generated"; result: TemplatesResult; transcript: string; keys: string[] }
  | { type: "setText"; key: string; field: CardTextField; value: string }
  | { type: "setExercise"; key: string; index: number; field: keyof Exercise; value: string }
  | { type: "addExercise"; key: string }
  | { type: "removeExercise"; key: string; index: number }
  | { type: "setList"; key: string; field: ProgramListField; items: string[] }
  | { type: "saved"; key: string; id: string }
  | { type: "failed"; key: string; error: CardError }
  | { type: "dropCard"; key: string }
  | { type: "reset" };

export function dictationReducer(state: Dictation, action: DictationAction): Dictation {
  switch (action.type) {
    case "restore":
      return action.state;
    case "stamp":
      return { ...state, userId: action.userId, clinicId: action.clinicId };
    case "typeTranscript":
      return { ...state, transcript: action.text };
    case "heard": {
      const before = state.transcript.trim();
      const heard = action.text.trim();
      if (!heard) return state;
      return { ...state, transcript: before ? `${before}\n\n${heard}` : heard };
    }
    case "pickSample":
      return { ...state, transcript: action.text };
    case "generated":
      // New cards replace the old ones; the saved ones are in the library already.
      return {
        ...state,
        cards: action.result.templates.map((t, i) => ({
          key: action.keys[i] ?? String(i),
          name: t.name,
          area: t.area ?? "",
          program: { ...t.program, patient_first_name: null, next_appointment: null },
          questions: t.questions,
          savedId: null,
          error: null,
        })),
        general: action.result.missing_or_unclear,
        resultTranscript: action.transcript,
      };
    case "reset":
      return { ...emptyDictation, userId: state.userId, clinicId: state.clinicId };
  }

  // Everything below changes one card; a saved card stays as it was saved.
  const card = state.cards.find((c) => c.key === action.key);
  if (!card || (card.savedId && action.type !== "dropCard")) return state;
  const put = (changes: Partial<DictatedCard>): Dictation => ({
    ...state,
    cards: state.cards.map((c) => (c.key === action.key ? { ...c, ...changes } : c)),
  });
  // An edit clears the last refusal: the physio is fixing it.
  const edit = (program: Partial<PatientProgram>) => put({ program: { ...card.program, ...program }, error: null });

  switch (action.type) {
    case "setText":
      return action.field === "title" ? edit({ title: action.value }) : put({ [action.field]: action.value, error: null });
    case "setExercise":
      return edit({
        exercises: card.program.exercises.map((e, i) => (i === action.index ? { ...e, [action.field]: exerciseValue(action.field, action.value) } : e)),
      });
    case "addExercise":
      return edit({ exercises: [...card.program.exercises, emptyExercise()] });
    case "removeExercise":
      return edit({ exercises: card.program.exercises.filter((_, i) => i !== action.index) });
    case "setList":
      return edit({ [action.field]: action.items });
    case "saved":
      return put({ savedId: action.id, error: null });
    case "failed":
      return put({ error: action.error });
    case "dropCard":
      return { ...state, cards: state.cards.filter((c) => c.key !== action.key) };
  }
  return state;
}

// The text changed after the cards were made from it (another recording, typing, a sample).
export function isDictationStale(state: Dictation): boolean {
  return state.cards.length > 0 && state.resultTranscript !== null && state.resultTranscript.trim() !== state.transcript.trim();
}

// A name as the library compares them (the database: spaces tidied, capitals don't count).
export const nameKey = (name: string) => name.trim().replace(/\s+/g, " ").toLocaleLowerCase("el");

// What stops a card from being saved, checked before it is sent (the database checks it all again).
export function cardProblem(card: DictatedCard): CardError | null {
  const name = nameKey(card.name);
  if (!name || name.length > NAME_MAX) return "badname";
  if (card.area.trim().replace(/\s+/g, " ").length > AREA_MAX) return "badarea";
  const program = cleanProgram(card.program);
  if (program.exercises.length < 1 || program.exercises.length > 40) return "badprogram";
  if (program.exercises.some((e) => e.sets !== null && e.sets > 99)) return "badprogram";
  return null;
}

// The name is in the library already (libraryNames: the library's names, as nameKey, when the page opened),
// or another card here was saved under it. Only a warning while typing: the library may have changed since
// (an archived template frees its name), so the database decides on «Αποθήκευση».
export function nameTaken(card: DictatedCard, libraryNames: ReadonlySet<string>, cards: DictatedCard[]): boolean {
  const name = nameKey(card.name);
  return name !== "" && (libraryNames.has(name) || cards.some((c) => c.key !== card.key && c.savedId !== null && nameKey(c.name) === name));
}

// Reads a saved state; anything that doesn't match the current shape gives null.
export function parseDictation(json: string | null): Dictation | null {
  if (!json) return null;
  try {
    const parsed = Dictation.safeParse(JSON.parse(json));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}
