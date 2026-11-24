// «Αλλαγή ασκήσεων»: say what changes → «Εφαρμογή αλλαγών» → «Τι άλλαξε» and the card → «Αποθήκευση αλλαγών».
// The AI call and updateTemplateProgram are replaced; what the database allows is in rls_check.sql.
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }) }));
const api = vi.hoisted(() => ({ editTemplate: vi.fn(), transcribeAudio: vi.fn() }));
vi.mock("@/app/lib/notes/api", async (actual) => ({ ...(await actual<typeof import("@/app/lib/notes/api")>()), ...api }));
const actions = vi.hoisted(() => ({ updateTemplateProgram: vi.fn() }));
vi.mock("@/app/lib/templates/actions", () => actions);

import type { PatientProgram } from "@/app/lib/notes/schema";
import { expectNoA11yViolations } from "@/app/test/axe";

import { editKey, EditTemplateForm } from "./EditTemplateForm";

const CLINIC = "11111111-2222-4333-8444-555555555555";
const USER = "aaaaaaaa-0000-4000-8000-000000000001";
const ID = "5eed0000-0000-4000-8000-0000000000d1";
const sample = { id: "template-edit", title: "Παράδειγμα αλλαγής", text: "Βγάλε το γλίστρημα, γέφυρα 3 σετ των 10." };
const program: PatientProgram = {
  title: "Γόνατο",
  patient_first_name: null,
  next_appointment: null,
  exercises: [
    { name: "Ανυψώσεις", sets: 3, reps: "10", hold: null, frequency: null, notes: null },
    { name: "Γλίστρημα φτέρνας", sets: 3, reps: "15", hold: null, frequency: null, notes: null },
  ],
  after_exercises: [],
  avoid: [],
  contact_if: [],
  other: [],
};
const edited: PatientProgram = { ...program, exercises: [program.exercises[0], { name: "Γέφυρα", sets: 3, reps: "10", hold: null, frequency: null, notes: null }] };
const answer = {
  result: {
    changes: [
      { said: "Βγάλε το γλίστρημα", applied: true, question: null },
      { said: "Γέφυρα 3×10", applied: false, question: "Πόσο συχνά η γέφυρα;" },
    ],
    name: null,
    area: null,
    program: edited,
    questions: [],
  },
  seconds: 8,
};

const open = (libraryNames: string[] = []) =>
  render(
    <main>
      <EditTemplateForm clinicId={CLINIC} userId={USER} template={{ id: ID, name: "Γόνατο ACL", area: "Γόνατο", program }} libraryNames={libraryNames} sample={sample} />
    </main>,
  );

async function applySample() {
  const user = userEvent.setup();
  open();
  await user.click(await screen.findByRole("button", { name: "Παράδειγμα αλλαγής" }));
  await user.click(screen.getByRole("button", { name: /^Εφαρμογή αλλαγών/ }));
  await screen.findByText("Πόσο συχνά η γέφυρα;");
  return user;
}

beforeEach(() => {
  vi.clearAllMocks();
  sessionStorage.clear();
  api.editTemplate.mockResolvedValue(answer);
  actions.updateTemplateProgram.mockResolvedValue({ ok: true, id: ID });
});
afterEach(() => vi.restoreAllMocks());

describe("EditTemplateForm", () => {
  it("starts from the saved template, with nothing changed yet", async () => {
    open();
    expect(await screen.findByText("Τίποτα ακόμα.")).toBeInTheDocument();
    expect(screen.getByLabelText("Όνομα του προτύπου")).toHaveValue("Γόνατο ACL");
    expect(screen.getAllByLabelText(/^Άσκηση \d/).map((input) => (input as HTMLInputElement).value)).toEqual(["Ανυψώσεις", "Γλίστρημα φτέρνας"]);
  });

  it("sends what was said with the template's id; shows the questions and exactly what changed", async () => {
    await applySample();
    expect(api.editTemplate).toHaveBeenCalledWith(sample.text, ID);
    const changed = screen.getByRole("heading", { name: /Τι άλλαξε/ }).parentElement!;
    expect(changed).toHaveTextContent("Βγαίνει: Γλίστρημα φτέρνας");
    expect(changed).toHaveTextContent("Μπαίνει: Γέφυρα · 3 σετ × 10 επαναλήψεις");
    expect(actions.updateTemplateProgram).not.toHaveBeenCalled();
  });

  it("«Αποθήκευση αλλαγών» replaces the template with the card as checked", async () => {
    const user = await applySample();
    await user.click(screen.getByRole("button", { name: /^Αποθήκευση αλλαγών/ }));
    expect(actions.updateTemplateProgram).toHaveBeenCalledWith({ clinicId: CLINIC, templateId: ID, name: "Γόνατο ACL", area: "Γόνατο", program: edited });
    expect(await screen.findByText(/Οι αλλαγές στο «Γόνατο ACL» αποθηκεύτηκαν/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Άνοιγμα" })).toHaveAttribute("href", `/templates?open=${ID}#t-${ID}`);
  });

  it("archived meanwhile: says so on the card", async () => {
    actions.updateTemplateProgram.mockResolvedValue({ ok: false, error: "gone" });
    const user = await applySample();
    await user.click(screen.getByRole("button", { name: /^Αποθήκευση αλλαγών/ }));
    expect(await screen.findByText(/Το πρότυπο δεν βρέθηκε πια/)).toBeInTheDocument();
  });

  it("«Ακύρωση αλλαγών» goes back to the saved template", async () => {
    const user = await applySample();
    await user.click(screen.getByRole("button", { name: /^Ακύρωση αλλαγών/ }));
    expect(screen.getByText("Τίποτα ακόμα.")).toBeInTheDocument();
    expect(screen.getAllByLabelText(/^Άσκηση \d/)).toHaveLength(2);
  });

  it("asks before what was said replaces edits made by hand", async () => {
    const user = userEvent.setup();
    open();
    const title = await screen.findByLabelText("Τίτλος για τον ασθενή");
    await user.type(title, " – φάση 2");
    expect(screen.getByText(/Τίτλος: «Γόνατο» → «Γόνατο – φάση 2»/)).toBeInTheDocument(); // edited by hand
    await user.click(screen.getByRole("button", { name: "Παράδειγμα αλλαγής" }));
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
    await user.click(screen.getByRole("button", { name: /^Εφαρμογή αλλαγών/ }));
    expect(confirm).toHaveBeenCalled();
    expect(api.editTemplate).not.toHaveBeenCalled();
  });

  it("keeps the work across a refresh, but not once the saved template has changed", async () => {
    await applySample();
    cleanup();
    open();
    expect(await screen.findByText("Πόσο συχνά η γέφυρα;")).toBeInTheDocument();
    cleanup();
    // the same template, changed since (another tab): the old work is not shown
    render(
      <main>
        <EditTemplateForm clinicId={CLINIC} userId={USER} template={{ id: ID, name: "Γόνατο ACL", area: "Γόνατο", program: edited }} libraryNames={[]} sample={sample} />
      </main>,
    );
    expect(await screen.findByText("Τίποτα ακόμα.")).toBeInTheDocument();
    expect(sessionStorage.getItem(editKey(ID))).not.toContain("Πόσο συχνά η γέφυρα;");
  });

  it("has no accessibility problems", async () => {
    await applySample();
    await expectNoA11yViolations(document.body);
  });

  it("warns about another template's name", async () => {
    const user = userEvent.setup();
    open(["ώμος"]);
    const name = await screen.findByLabelText("Όνομα του προτύπου");
    await user.clear(name);
    await user.type(name, "Ώμος");
    expect(within(name.parentElement!).getByText(/Υπάρχει ήδη πρότυπο με αυτό το όνομα/)).toBeInTheDocument();
  });
});
