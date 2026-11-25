// Which sticky note the tour shows, read from the page as it is (app/lib/demo/notes.ts).
import { beforeEach, describe, expect, it } from "vitest";

import { pickNote } from "@/app/lib/demo/notes";
import type { Tour } from "@/app/lib/demo/tour";

const page = (html: string) => {
  document.body.innerHTML = html;
};
const step = (n: 1 | 2 | 3 | 4, more: Partial<Tour> = {}): Tour => ({ step: n, ...more });
const picked = (path: string, tour: Tour) => {
  const note = pickNote(document, path, tour);
  return note && { id: note.id, text: note.target.textContent?.trim() };
};

beforeEach(() => page(""));

describe("pickNote, step 1", () => {
  const patients = (checked: boolean) => `<main>
    <label><input type="radio" name="patient"> + Νέος ασθενής</label>
    <label><input type="radio" name="patient" ${checked ? "checked" : ""}>Γιώργος Π.</label>
    <button type="button">Συνέχεια →</button></main>`;

  it("the patient page: Γιώργος Π., then «Συνέχεια»", () => {
    page(patients(false));
    expect(picked("/notes/new", step(1))).toEqual({ id: "pickPatient", text: "Γιώργος Π." });
    page(patients(true));
    expect(picked("/notes/new", step(1))).toEqual({ id: "continue", text: "Συνέχεια →" });
  });

  it("George P. in an English demo", () => {
    page(`<main><label><input type="radio">George P.</label><button>Συνέχεια</button></main>`);
    expect(picked("/notes/new", step(1))?.id).toBe("pickPatient");
  });

  it("the program choice: «Αλλαγή προγράμματος», not «Ίδιο πρόγραμμα»", () => {
    page(`<main><button>Ίδιο πρόγραμμα</button><button><span>Αλλαγή προγράμματος</span></button></main>`);
    expect(picked("/notes/program", step(1))?.text).toBe("Αλλαγή προγράμματος");
  });

  it("the recording page: the sample and the recording button (one note), then «Δημιουργία προγράμματος»", () => {
    page(`<main><button>Έναρξη ηχογράφησης</button><button>Ελένη · δεξιός ώμος</button><button>Γιώργος · αριστερό γόνατο</button></main>`);
    expect(picked("/notes/record", step(1))).toEqual({ id: "sample", text: "Γιώργος · αριστερό γόνατο" });
    expect(pickNote(document, "/notes/record", step(1))?.also?.textContent).toBe("Έναρξη ηχογράφησης");
    page(`<main><button>Έναρξη ηχογράφησης</button></main>`);
    expect(picked("/notes/record", step(1))?.id).toBe("record");
    page(`<main><h2 id="txt-h">Τι ακούσαμε</h2><button>Δημιουργία προγράμματος →</button></main>`);
    expect(picked("/notes/record", step(1))?.id).toBe("generate");
    // still there while it writes
    page(`<main><h2 id="txt-h">Τι ακούσαμε</h2><button disabled>Γράφουμε το πρόγραμμα…</button></main>`);
    expect(picked("/notes/record", step(1))?.id).toBe("generate");
  });

  it("the review: the procedure code, then a bed, then «Έγκριση»", () => {
    const review = (code: string, bed: boolean) => `<main>
      <select id="f-activityCode"><option value="">Διαλέξτε…</option><option value="PHYS02" ${code ? "selected" : ""}>PHYS02</option></select>
      <fieldset><label><input type="radio" name="where" ${bed ? "checked" : ""}>Κρεβάτι 4</label><label><input type="radio" name="where">Μόνο για το σπίτι</label></fieldset>
      <button type="submit">Έγκριση · Αίθουσα · Κρεβάτι 4 →</button></main>`;
    page(review("", false));
    expect(picked("/notes/review", step(1))?.id).toBe("code");
    page(review("PHYS02", false));
    expect(picked("/notes/review", step(1))?.id).toBe("bed");
    page(review("PHYS02", true));
    expect(picked("/notes/review", step(1))?.id).toBe("approve");
  });

  it("nothing on the board in step 1 (the step card has its button), or on other pages", () => {
    page(`<main><button>Συνέχεια</button></main>`);
    expect(pickNote(document, "/", step(1))).toBeNull();
    expect(pickNote(document, "/patients", step(1))).toBeNull();
  });
});

describe("pickNote, steps 2 and 3", () => {
  it("the program page: the link to the patient's screen (not on the paper sheet)", () => {
    page(`<main><a href="/s/tok" target="_blank">https://…/s/tok</a></main>`);
    expect(picked("/programs/p1", step(2))?.id).toBe("phoneLink");
    expect(pickNote(document, "/programs/p1/print", step(2))).toBeNull();
  });

  it("the patient's screen: «Χρειάζομαι τον φυσιοθεραπευτή», «Πονάω», then back to the room", () => {
    page(`<button><svg></svg>Χρειάζομαι τον φυσιοθεραπευτή</button>`);
    expect(picked("/s/tok", step(2))?.id).toBe("needPhysio");
    page(`<fieldset><button><span>?</span>Έχω απορία</button><button><span aria-hidden="true">!</span>Πονάω</button></fieldset>`);
    expect(picked("/s/tok", step(2))).toEqual({ id: "pain", text: "!Πονάω" });
    page(`<section role="status"><p>Ο φυσιοθεραπευτής ειδοποιήθηκε</p></section>`);
    expect(picked("/s/tok", step(2))?.id).toBe("backToRoom");
  });

  it("the board in step 3: «Το είδα» on the card that called, not on another one", () => {
    page(`<main><article id="patient-h1"><button>✓ Το είδα</button></article><article id="patient-g1"><button>✓ Το είδα</button></article></main>`);
    const note = pickNote(document, "/", step(3, { calledCard: "g1" }));
    expect(note?.id).toBe("seen");
    expect(note?.target.closest("article")?.id).toBe("patient-g1");
  });
});

describe("pickNote, when there is nothing to show", () => {
  it("not after the tour, not before it, and not once the visitor closed the notes", () => {
    page(`<main><label><input type="radio">Γιώργος Π.</label></main>`);
    expect(pickNote(document, "/notes/new", step(4))).toBeNull();
    expect(pickNote(document, "/notes/new", { step: 0 })).toBeNull();
    expect(pickNote(document, "/notes/new", step(1, { notes: false }))).toBeNull();
  });

  it("a button that isn't on the page: no note rather than a wrong one", () => {
    page(`<main><p>Φόρτωση…</p></main>`);
    expect(pickNote(document, "/notes/program", step(1))).toBeNull();
    expect(pickNote(document, "/notes/review", step(1))).toBeNull();
  });
});
