import { render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { DraftProvider } from "@/app/context/DraftContext";
import { RoomBoard } from "@/app/features/room/RoomBoard";
import type { Exercise, PatientProgram } from "@/app/lib/schema";
import { type Session, applyPatientAction, startSession } from "@/app/lib/session";
import { expectNoA11yViolations } from "@/app/test/axe";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));

const exercise = (name: string, sets: number | null): Exercise => ({ name, sets, reps: "10", hold: null, frequency: null, notes: null });
const program = (name: string): PatientProgram => ({
  patient_first_name: name,
  title: "Πρόγραμμα ασκήσεων",
  exercises: [exercise("Wall slides", 2), exercise("Pendulum", null)],
  after_exercises: [],
  avoid: [],
  contact_if: [],
  other: [],
  next_appointment: null,
});
const T = "2026-10-18T10:05:00.000Z";
const session = (name: string, id: string) => startSession(program(name), { patient: name } as never, id, "2026-10-18T10:00:00.000Z");

const working: Session = applyPatientAction(session("Γιώργος", "2026-10-18-aaaaaaa1"), { type: "setDone", exercise: 0, set: 1 }, T);
const inPain: Session = applyPatientAction(session("Ελένη", "2026-10-18-aaaaaaa2"), { type: "call", reason: "pain" }, "2026-10-18T10:02:00.000Z");
const finished: Session = [
  { type: "setDone", exercise: 0, set: 1 },
  { type: "setDone", exercise: 0, set: 2 },
  { type: "setDone", exercise: 1, set: 1 },
].reduce((s, a) => applyPatientAction(s, a as never, T), session("Μαρία", "2026-10-18-aaaaaaa3"));

const renderBoard = (sessions: Session[]) => {
  vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ sessions, now: T }), { status: 200 })));
  return render(
    <DraftProvider>
      <RoomBoard initial={sessions} initialNow={T} />
    </DraftProvider>,
  );
};

afterEach(() => vi.unstubAllGlobals());

describe("RoomBoard", () => {
  it("shows each patient's progress and who needs the physio, in words", () => {
    renderBoard([working, inPain, finished]);
    expect(screen.getByText("3 ασθενείς · 1 χρειάζεται εσάς")).toBeInTheDocument();
    const card = (name: string) => within(screen.getByRole("article", { name }));

    expect(card("Γιώργος").getByText("Ασκείται")).toBeInTheDocument();
    expect(card("Γιώργος").getByText("Σετ 2 από 2")).toBeInTheDocument(); // wall slides, second set
    expect(card("Γιώργος").getByText("Ασκήσεις: τώρα η 1 από 2")).toBeInTheDocument(); // the numbered boxes, in words
    expect(card("Ελένη").getByText("Χρειάζεται εσάς · Πόνος")).toBeInTheDocument();
    expect(card("Ελένη").getByText("πριν από 3 λεπτά")).toBeInTheDocument();
    expect(card("Μαρία").getByText("Τελείωσε")).toBeInTheDocument();
    expect(card("Μαρία").getByText("Ασκήσεις: και οι 2 έγιναν")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Το είδα" })).toBeInTheDocument(); // only for the call
  });

  it("sums up the room and lists who is waiting, in the order they called", () => {
    const question: Session = applyPatientAction(session("Ανδρέας", "2026-10-18-aaaaaaa4"), { type: "call", reason: "question" }, "2026-10-18T10:04:00.000Z");
    renderBoard([working, question, inPain, finished]); // board order: as they arrived
    const summary = within(screen.getByRole("region", { name: "Σύνοψη αίθουσας" }));
    expect(summary.getByText("Χρειάζονται εσάς").nextSibling).toHaveTextContent("2"); // label first for screen readers; CSS puts the number on top
    const waiting = summary.getAllByRole("listitem").map((li) => li.textContent);
    expect(waiting[0]).toMatch(/Ελένη · Πόνος πριν από 3 λεπτά/); // called first
    expect(waiting[1]).toMatch(/Ανδρέας · Απορία πριν από 1 λεπτό/);
  });

  it("says when the room is empty and offers a new patient", () => {
    renderBoard([]);
    expect(screen.getByText("Δεν υπάρχουν ασθενείς στην αίθουσα.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Νέος ασθενής" })).toBeInTheDocument();
  });

  it("has no accessibility problems", async () => {
    const { container } = renderBoard([working, inPain, finished]);
    await expectNoA11yViolations(container);
  });
});
