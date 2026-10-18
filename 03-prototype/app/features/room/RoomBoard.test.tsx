import { render, screen } from "@testing-library/react";
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
    expect(screen.getByText(/Ασκείται/)).toBeInTheDocument();
    expect(screen.getByText("Χρειάζεται εσάς · Πόνος")).toBeInTheDocument();
    expect(screen.getByText("πριν από 3 λεπτά")).toBeInTheDocument();
    expect(screen.getByText("Τελείωσε")).toBeInTheDocument();
    expect(screen.getByText(/σετ 2 από 2/)).toBeInTheDocument(); // Γιώργος: wall slides, second set
    expect(screen.getByRole("button", { name: "Το είδα" })).toBeInTheDocument(); // only for the call
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
