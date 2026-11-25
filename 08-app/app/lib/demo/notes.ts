// The sticky notes of the demo's guided tour (TourNotes): which button the visitor should press next, read from
// the page as it is right now. One note at a time, on the button itself, gone once it is pressed: the page
// changes and the next note is picked. The screens belong to the app, not the tour, so the notes find their
// buttons by what they say (the Greek of the app), and simply show nothing if a button isn't there.
//   step 1  /notes/new      Γιώργος Π. → «Συνέχεια»
//           /notes/program  «Αλλαγή προγράμματος»
//           /notes/record   the sample «Γιώργος · αριστερό γόνατο» and «Έναρξη ηχογράφησης» (one note, two
//                           arrows: either will do) → «Δημιουργία προγράμματος»
//           /notes/review   the procedure code (inside the GeSY note) → a bed → «Έγκριση»
//   step 2  /programs/…     the link to the patient's screen
//           /s/…            «Χρειάζομαι τον φυσιοθεραπευτή» → «Πονάω» → back to the room
//   step 3  /               «Το είδα» on the card that called
import type { Tour } from "@/app/lib/demo/tour";

export type NoteId =
  | "pickPatient"
  | "continue"
  | "changeProgram"
  | "sample"
  | "record"
  | "generate"
  | "code"
  | "bed"
  | "approve"
  | "phoneLink"
  | "needPhysio"
  | "pain"
  | "backToRoom"
  | "seen";

// also: a second button the same note points to (an either/or).
export type Note = { id: NoteId; target: HTMLElement; also?: HTMLElement };

// The first element under root matching selector whose text matches.
function byText(root: ParentNode, selector: string, text: RegExp): HTMLElement | null {
  for (const el of root.querySelectorAll<HTMLElement>(selector)) if (text.test(el.textContent ?? "")) return el;
  return null;
}

const note = (id: NoteId, target: HTMLElement | null, also?: HTMLElement | null): Note | null =>
  target ? { id, target, ...(also && { also }) } : null;

// The demo's own Γιώργος Π. (George P. in an English demo).
const GEORGE = /^\s*(Γιώργος Π\.|George P\.)\s*$/;

export function pickNote(doc: Document, path: string, tour: Tour): Note | null {
  if (tour.notes === false) return null;
  const main = doc.querySelector("main") ?? doc.body;

  if (tour.step === 1) {
    if (path === "/notes/new") {
      const george = byText(main, "label", GEORGE);
      if (george && !george.querySelector("input:checked")) return note("pickPatient", george);
      return note("continue", byText(main, "button", /^\s*Συνέχεια/));
    }
    if (path === "/notes/program") return note("changeProgram", byText(main, "button", /Αλλαγή προγράμματος/));
    if (path === "/notes/record") {
      // Text to write from (said, or a sample): create. Before that: the sample, or the recording button.
      if (doc.getElementById("txt-h")) return note("generate", byText(main, "button", /Δημιουργία (προγράμματος|σημείωσης)|Γράφουμε/));
      const record = byText(main, "button", /Έναρξη ηχογράφησης/);
      return note("sample", byText(main, "button", /Γιώργος · αριστερό γόνατο/), record) ?? note("record", record);
    }
    if (path === "/notes/review") {
      const code = doc.getElementById("f-activityCode") as HTMLSelectElement | null;
      if (code && !code.value) return note("code", code);
      const where = byText(main, "fieldset", /Μόνο για το σπίτι/);
      if (where && !where.querySelector("input:checked")) return note("bed", where);
      return note("approve", byText(main, "button[type=submit]", /Έγκριση/));
    }
    return null;
  }

  if (tour.step === 2) {
    if (/^\/programs\/[^/]+$/.test(path)) return note("phoneLink", main.querySelector<HTMLElement>("a[target=_blank]"));
    if (path.startsWith("/s/")) {
      const called = byText(doc.body, "[role=status]", /Ο φυσιοθεραπευτής ειδοποιήθηκε/);
      if (called) return note("backToRoom", called);
      return note("pain", byText(doc.body, "button", /^\s*!?\s*Πονάω\s*$/)) ?? note("needPhysio", byText(doc.body, "button", /Χρειάζομαι τον φυσιοθεραπευτή/));
    }
    return null;
  }

  if (tour.step === 3 && path === "/" && tour.calledCard) {
    const card = doc.getElementById(`patient-${tour.calledCard}`);
    return note("seen", card && byText(card, "button", /Το είδα/));
  }
  return null;
}
