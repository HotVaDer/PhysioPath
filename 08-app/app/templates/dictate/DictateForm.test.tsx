// «Πείτε τα πρότυπά σας»: text → «Δημιουργία προτύπων» → one card per template → «Αποθήκευση» (one, or all).
// The AI call and createTemplate are replaced; what the database allows is in supabase/checks/rls_check.sql.
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }) }));
const api = vi.hoisted(() => ({ generateTemplates: vi.fn(), transcribeAudio: vi.fn() }));
vi.mock("@/app/lib/notes/api", async (actual) => ({ ...(await actual<typeof import("@/app/lib/notes/api")>()), ...api }));
const actions = vi.hoisted(() => ({ createTemplate: vi.fn() }));
vi.mock("@/app/lib/templates/actions", () => actions);

import type { DictatedTemplate, PatientProgram } from "@/app/lib/notes/schema";
import { parseDictation } from "@/app/lib/templates/dictation";
import { expectNoA11yViolations } from "@/app/test/axe";

import { DICTATION_KEY, DictateForm } from "./DictateForm";

const CLINIC = "11111111-2222-4333-8444-555555555555";
const USER = "aaaaaaaa-0000-4000-8000-000000000001";
const sample = { id: "templates", title: "Τρία πρότυπα", text: "Πρώτο, γόνατο… Δεύτερο, ώμος…" };

const program = (title: string): PatientProgram => ({
  title,
  patient_first_name: null,
  next_appointment: null,
  exercises: [{ name: "Γέφυρα", sets: 3, reps: "10", hold: null, frequency: null, notes: null }],
  after_exercises: [],
  avoid: [],
  contact_if: [],
  other: [],
});
const knee: DictatedTemplate = { name: "Γόνατο μετά ACL", area: "Γόνατο", program: program("Γόνατο"), questions: ["Πόσο συχνά η γέφυρα;"] };
const shoulder: DictatedTemplate = { name: "Ώμος – κινητικότητα", area: "Ώμος", program: program("Ώμος"), questions: [] };
const back: DictatedTemplate = { name: "Μέση", area: "Μέση", program: program("Μέση"), questions: [] };

const open = (libraryNames: string[] = []) =>
  render(
    <main>
      <DictateForm clinicId={CLINIC} userId={USER} libraryNames={libraryNames} sample={sample} />
    </main>,
  ); // StaffSheet gives the real page its <main>

async function generate(templates: DictatedTemplate[], general: string[] = []) {
  api.generateTemplates.mockResolvedValue({ result: { templates, missing_or_unclear: general }, seconds: 20 });
  const user = userEvent.setup();
  open();
  await user.click(await screen.findByRole("button", { name: "Τρία πρότυπα" }));
  await user.click(screen.getByRole("button", { name: /^Δημιουργία προτύπων/ }));
  await screen.findByRole("heading", { name: /^Βρήκαμε/ });
  return user;
}

beforeEach(() => {
  vi.clearAllMocks();
  sessionStorage.clear();
  actions.createTemplate.mockImplementation(async () => ({ ok: true, id: crypto.randomUUID() }));
});
afterEach(() => vi.restoreAllMocks());

describe("DictateForm", () => {
  it("sends the text, shows one card per template with its questions, and saves nothing by itself", async () => {
    await generate([knee, shoulder], ["Το τέταρτο δεν είχε ασκήσεις."]);
    expect(api.generateTemplates).toHaveBeenCalledWith(sample.text);
    expect(screen.getByRole("heading", { name: "Βρήκαμε 2 πρότυπα" })).toBeTruthy();
    expect(screen.getByText("Το τέταρτο δεν είχε ασκήσεις.")).toBeTruthy();
    const card = screen.getByRole("article", { name: /Πρότυπο 1/ });
    expect(within(card).getByText("Πόσο συχνά η γέφυρα;")).toBeTruthy();
    expect(within(card).getByLabelText("Όνομα του προτύπου")).toHaveProperty("value", "Γόνατο μετά ACL");
    expect(actions.createTemplate).not.toHaveBeenCalled();
  });

  it("«Αποθήκευση» saves that card as edited, which then folds to one line", async () => {
    const user = await generate([knee, shoulder]);
    const card = screen.getByRole("article", { name: /Πρότυπο 1/ });
    const name = within(card).getByLabelText("Όνομα του προτύπου");
    await user.clear(name);
    await user.type(name, "Γόνατο ACL – εβδ. 1");
    await user.click(within(card).getByRole("button", { name: /^Αποθήκευση: / }));
    expect(actions.createTemplate).toHaveBeenCalledWith({ clinicId: CLINIC, name: "Γόνατο ACL – εβδ. 1", area: "Γόνατο", program: knee.program });
    expect(await screen.findByText(/«Γόνατο ACL – εβδ\. 1» αποθηκεύτηκε στα πρότυπα/)).toBeTruthy();
    expect(screen.getAllByRole("article")).toHaveLength(1);
  });

  it("«Αποθήκευση όλων» saves one at a time; a refused one stays with its problem", async () => {
    actions.createTemplate.mockImplementation(async ({ name }: { name: string }) =>
      name === "Ώμος – κινητικότητα" ? { ok: false, error: "taken" } : { ok: true, id: crypto.randomUUID() },
    );
    const user = await generate([knee, shoulder, back]);
    await user.click(screen.getByRole("button", { name: "Αποθήκευση όλων (3)" }));
    expect(actions.createTemplate).toHaveBeenCalledTimes(3);
    const left = await screen.findByRole("article", { name: /Ώμος – κινητικότητα/ });
    expect(within(left).getByText(/Υπάρχει ήδη πρότυπο με αυτό το όνομα/)).toBeTruthy();
    expect(screen.getAllByRole("article")).toHaveLength(1);
  });

  it("a card without exercises is not sent; «Δεν το θέλω» drops a card", async () => {
    const user = await generate([{ ...knee, program: { ...knee.program, exercises: [] } }, shoulder]);
    const card = screen.getByRole("article", { name: /Πρότυπο 1/ });
    await user.click(within(card).getByRole("button", { name: /^Αποθήκευση: / }));
    expect(within(card).getByText(/Χρειάζεται τουλάχιστον μία άσκηση/)).toBeTruthy();
    expect(actions.createTemplate).not.toHaveBeenCalled();
    await user.click(within(screen.getByRole("article", { name: /Ώμος/ })).getByRole("button", { name: /^Δεν το θέλω/ }));
    expect(screen.queryByRole("article", { name: /Ώμος/ })).toBeNull();
  });

  it("warns while typing a name that is already in the library", async () => {
    api.generateTemplates.mockResolvedValue({ result: { templates: [knee], missing_or_unclear: [] }, seconds: 20 });
    const user = userEvent.setup();
    open(["γόνατο μετά acl"]);
    await user.click(await screen.findByRole("button", { name: "Τρία πρότυπα" }));
    await user.click(screen.getByRole("button", { name: /^Δημιουργία προτύπων/ }));
    expect(await screen.findByText(/Υπάρχει ήδη πρότυπο με αυτό το όνομα/)).toBeTruthy();
  });

  it("asks before new cards replace ones not saved yet", async () => {
    const user = await generate([knee]);
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
    await user.click(screen.getByRole("button", { name: /^Δημιουργία προτύπων ξανά/ }));
    expect(confirm).toHaveBeenCalledWith(expect.stringContaining("Ένα πρότυπο δεν έχει αποθηκευτεί"));
    expect(api.generateTemplates).toHaveBeenCalledTimes(1);
  });

  it("keeps the work in this tab across a refresh, and never shows another person's", async () => {
    await generate([knee, shoulder]);
    const saved = parseDictation(sessionStorage.getItem(DICTATION_KEY));
    expect(saved).toMatchObject({ userId: USER, clinicId: CLINIC, transcript: sample.text });
    expect(saved?.cards).toHaveLength(2);

    cleanup();
    open();
    expect(await screen.findByRole("heading", { name: "Βρήκαμε 2 πρότυπα" })).toBeTruthy();
    cleanup();

    sessionStorage.setItem(DICTATION_KEY, JSON.stringify({ ...saved, userId: "bbbbbbbb-0000-4000-8000-000000000002" }));
    open();
    await screen.findByRole("button", { name: "Τρία πρότυπα" });
    expect(screen.queryByRole("heading", { name: /^Βρήκαμε/ })).toBeNull();
  });

  it("a demo with no recordings left rests the record buttons; the sample still works", async () => {
    render(<DictateForm clinicId={CLINIC} userId={USER} libraryNames={[]} sample={sample} demoLeft={{ of: 5, generate: 2, transcribe: 0 }} />);
    expect((await screen.findByRole("button", { name: "Έναρξη ηχογράφησης" })).hasAttribute("disabled")).toBe(true);
    expect(screen.getByText(/Τελείωσαν οι ηχογραφήσεις της δοκιμής/)).toBeTruthy();
    expect(screen.getByRole("button", { name: "Τρία πρότυπα" }).hasAttribute("disabled")).toBe(false);
  });

  it("has no accessibility problems, with cards on the page", async () => {
    await generate([knee, shoulder]);
    await expectNoA11yViolations(document.body);
  });
});
