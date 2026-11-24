// «Ξεκινήστε από πρότυπο» on the recording page: «Όπως είναι» writes only the note and keeps the template's
// program unchanged; «Με αλλαγές» sends the template's id with the text. The AI calls are replaced.
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push, replace: vi.fn(), refresh: vi.fn() }) }));
const api = vi.hoisted(() => ({ generateNote: vi.fn(), generateProgram: vi.fn(), transcribeAudio: vi.fn() }));
vi.mock("@/app/lib/notes/api", async (actual) => ({ ...(await actual<typeof import("@/app/lib/notes/api")>()), ...api }));

import { DraftProvider, STORAGE_KEY } from "@/app/lib/notes/DraftContext";
import { emptyDraft, parseDraft } from "@/app/lib/notes/draft";
import type { PatientProgram } from "@/app/lib/notes/schema";
import { RecordForm, type TemplateChoice } from "@/app/notes/record/RecordForm";

const CLINIC = "11111111-2222-4333-8444-555555555555";
const USER = "aaaaaaaa-0000-4000-8000-000000000001";
const program: PatientProgram = {
  title: "Πρόγραμμα ασκήσεων – Γόνατο", patient_first_name: null, next_appointment: null,
  exercises: [
    { name: "Ανυψώσεις τεντωμένου ποδιού", sets: 3, reps: "10", hold: null, frequency: "2 φορές τη μέρα", notes: null },
    { name: "Γλίστρημα φτέρνας", sets: 3, reps: "15", hold: null, frequency: null, notes: null },
  ],
  after_exercises: [], avoid: [], contact_if: [], other: [],
};
const knee: TemplateChoice = { id: "7b3c0d6e-8f41-4a2b-9c7d-1e2f3a4b5c6d", name: "Γόνατο μετά ACL", area: "Γόνατο", uses: 3, program };
const note = { patient_ref: "Γιώργος", body_area: "Γόνατο", service_given: "Κινητοποίηση", assessment_findings: null, treatment_plan: null, progress: null };

const open = (templates: TemplateChoice[] = [knee]) =>
  render(
    <DraftProvider clinicId={CLINIC} userId={USER}>
      <RecordForm samples={[]} templates={templates} />
    </DraftProvider>,
  );
const saved = () => parseDraft(sessionStorage.getItem(STORAGE_KEY));

beforeEach(() => {
  vi.clearAllMocks();
  sessionStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({ ...emptyDraft, transcript: "Σήμερα κινητοποίηση, πόνος 3/10.", patient: { id: null, label: "Γιώργος" }, clinicId: CLINIC, userId: USER }),
  );
  api.generateNote.mockResolvedValue({ result: { note, missing_or_unclear: [] }, seconds: 5 });
  api.generateProgram.mockResolvedValue({ result: { program, note, missing_or_unclear: [] }, seconds: 9 });
});
afterEach(() => sessionStorage.clear());

describe("RecordForm with templates", () => {
  it("«Όπως είναι» (the first choice): the template's exercises are shown, and only the note is written", async () => {
    open();
    await userEvent.click(await screen.findByRole("button", { name: /Γόνατο μετά ACL/ }));
    expect(screen.getByRole("radio", { name: /Όπως είναι/ })).toBeChecked();
    expect(screen.getByRole("region", { name: "Πρόγραμμα ασκήσεων – Γόνατο" })).toHaveTextContent("Γλίστρημα φτέρνας");
    await userEvent.click(screen.getByRole("button", { name: /Δημιουργία σημείωσης/ }));
    expect(api.generateNote).toHaveBeenCalledWith("Σήμερα κινητοποίηση, πόνος 3/10.", "el");
    expect(api.generateProgram).not.toHaveBeenCalled();
    expect(saved()?.result?.program).toEqual(program);
    expect(saved()?.result?.note).toEqual(note);
    expect(push).toHaveBeenCalledWith("/notes/review");
  });

  it("«Με αλλαγές»: the text and the template's id go to the AI", async () => {
    open();
    await userEvent.click(await screen.findByRole("button", { name: /Γόνατο μετά ACL/ }));
    await userEvent.click(screen.getByRole("radio", { name: /Με αλλαγές/ }));
    expect(screen.getByText(/Μόνο τι αλλάζει/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /Δημιουργία προγράμματος/ }));
    expect(api.generateProgram).toHaveBeenCalledWith("Σήμερα κινητοποίηση, πόνος 3/10.", "el", knee.id);
    expect(api.generateNote).not.toHaveBeenCalled();
  });

  it("no templates in the clinic: no picker", async () => {
    open([]);
    await screen.findByRole("heading", { name: "Ηχογράφηση" });
    expect(screen.queryByRole("heading", { name: /Πρότυπο/ })).toBeNull();
    expect(within(document.body).getByRole("button", { name: /Δημιουργία προγράμματος/ })).toBeInTheDocument();
  });
});
