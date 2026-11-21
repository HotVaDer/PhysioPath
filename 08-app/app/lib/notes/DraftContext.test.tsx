// The note in progress survives leaving the note's pages while a program is being made.
import { act, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { DraftProvider, STORAGE_KEY, useDraft } from "@/app/lib/notes/DraftContext";
import { emptyDraft, noteFor, parseDraft, type DraftAction } from "@/app/lib/notes/draft";
import type { VoiceNoteResult } from "@/app/lib/notes/schema";

const CLINIC = "11111111-2222-4333-8444-555555555555";
const DR_A = "aaaaaaaa-0000-4000-8000-000000000001";
const DR_B = "bbbbbbbb-0000-4000-8000-000000000002";
const DRAFT_ID = "5b3c0d6e-8f41-4a2b-9c7d-1e2f3a4b5c6d";
const result: VoiceNoteResult = {
  program: {
    patient_first_name: "Μαρία", title: "Πρόγραμμα", next_appointment: null,
    exercises: [{ name: "Γέφυρα", sets: 3, reps: "10", hold: null, frequency: null, notes: null }],
    after_exercises: [], avoid: [], contact_if: [], other: [],
  },
  note: { patient_ref: "Μαρία", body_area: "Γόνατο", service_given: null, assessment_findings: null, treatment_plan: null, progress: null },
  missing_or_unclear: [],
};

// Keeps the provider's dispatch (as RecordForm does while it waits for the AI) and shows the draft.
let keep: ((action: DraftAction) => void) | null = null;
function Grab() {
  const { draft, dispatch, ready } = useDraft();
  keep = dispatch;
  return <p data-testid="draft">{ready ? `${draft.patient?.label ?? "-"}|${draft.userId ?? "-"}` : "loading"}</p>;
}

afterEach(() => sessionStorage.clear());

describe("DraftProvider", () => {
  const forMaria = { ...emptyDraft, transcript: "Γέφυρα 3 σετ", patient: { id: null, label: "Μαρία" }, clinicId: CLINIC };

  it("a program that arrives after the physio left the note's pages is still kept", async () => {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(forMaria));
    const view = render(
      <DraftProvider clinicId={CLINIC} userId={DR_A}>
        <Grab />
      </DraftProvider>,
    );
    await act(async () => {}); // the saved draft is read back
    const startedFor = noteFor(forMaria);
    view.unmount(); // «Αίθουσα» in the top bar: the note's pages are gone
    keep!({ type: "generated", result, seconds: 20, noteLang: "el", draftId: DRAFT_ID, startedFor });
    const saved = parseDraft(sessionStorage.getItem(STORAGE_KEY));
    expect(saved?.result?.program.exercises[0].name).toBe("Γέφυρα");
    expect(saved?.transcript).toBe("Γέφυρα 3 σετ");
  });

  it("…but not when it was made for someone else", async () => {
    const forNikos = { ...forMaria, patient: { id: null, label: "Νίκος" } };
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(forNikos));
    const view = render(
      <DraftProvider clinicId={CLINIC} userId={DR_A}>
        <Grab />
      </DraftProvider>,
    );
    await act(async () => {});
    view.unmount();
    keep!({ type: "generated", result, seconds: 20, noteLang: "el", draftId: DRAFT_ID, startedFor: noteFor(forMaria) });
    expect(parseDraft(sessionStorage.getItem(STORAGE_KEY))?.result).toBeNull();
  });

  describe("the note belongs to whoever wrote it (a shared clinic computer)", () => {
    it("Dr A's unfinished note is thrown away when Dr B signs in on the same tab", async () => {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ ...forMaria, userId: DR_A }));
      render(
        <DraftProvider clinicId={CLINIC} userId={DR_B}>
          <Grab />
        </DraftProvider>,
      );
      await act(async () => {});
      expect(screen.getByTestId("draft")).toHaveTextContent(`-|${DR_B}`); // empty, now Dr B's
      expect(parseDraft(sessionStorage.getItem(STORAGE_KEY))?.patient).toBeNull();
    });

    it("Dr A gets their own note back", async () => {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ ...forMaria, userId: DR_A }));
      render(
        <DraftProvider clinicId={CLINIC} userId={DR_A}>
          <Grab />
        </DraftProvider>,
      );
      await act(async () => {});
      expect(screen.getByTestId("draft")).toHaveTextContent(`Μαρία|${DR_A}`);
    });

    it("a note saved before this change (no writer) is kept and stamped with the person signed in", async () => {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(forMaria));
      render(
        <DraftProvider clinicId={CLINIC} userId={DR_A}>
          <Grab />
        </DraftProvider>,
      );
      await act(async () => {});
      expect(screen.getByTestId("draft")).toHaveTextContent(`Μαρία|${DR_A}`);
    });
  });
});
