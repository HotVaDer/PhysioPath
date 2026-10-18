import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { SessionScreen } from "@/app/features/session/SessionScreen";
import type { Exercise, PatientProgram } from "@/app/lib/schema";
import { type PatientAction, type PatientSessionView, applyPatientAction, startSession } from "@/app/lib/session";
import { expectNoA11yViolations } from "@/app/test/axe";

const exercise = (name: string, sets: number | null, hold: string | null = null): Exercise => ({ name, sets, reps: "10", hold, frequency: null, notes: null });
const program: PatientProgram = {
  patient_first_name: "Ελένη",
  title: "Δεξιός ώμος",
  exercises: [exercise("Wall slides", 2), exercise("Isometric external rotation", null, "10 δευτερόλεπτα")],
  after_exercises: [],
  avoid: [],
  contact_if: [],
  other: [],
  next_appointment: null,
};
const T = "2026-10-18T10:00:00.000Z";
const view = (): PatientSessionView => {
  const { note: _note, ...rest } = startSession(program, { patient: null } as never, "2026-10-18-abc12345", T);
  return rest;
};

// A fake server: applies the patient's actions with the real rules and returns the new view.
function fakeServer(start: PatientSessionView) {
  let current = start;
  const sent: PatientAction[] = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (_url: string, init?: RequestInit) => {
      if (init?.method === "POST") {
        const action = JSON.parse(String(init.body)) as PatientAction;
        sent.push(action);
        const { note: _n, ...next } = applyPatientAction({ ...current, note: {} } as never, action, T);
        current = next;
      }
      return new Response(JSON.stringify(current), { status: 200 });
    }),
  );
  return sent;
}

afterEach(() => vi.unstubAllGlobals());

describe("SessionScreen", () => {
  it("shows one exercise at a time and moves on after the last set", async () => {
    const sent = fakeServer(view());
    render(<SessionScreen initial={view()} />);
    expect(screen.getByRole("heading", { level: 1, name: "Wall slides" })).toBeInTheDocument();
    expect(screen.getByText("Άσκηση 1 από 2")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Τελείωσα το σετ 1" }));
    expect(await screen.findByRole("button", { name: "Τελείωσα το σετ 2" })).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Τελείωσα το σετ 2" }));

    expect(await screen.findByRole("heading", { level: 1, name: "Isometric external rotation" })).toBeInTheDocument();
    expect(screen.getByText(/«Wall slides» ολοκληρώθηκε/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Ξεκίνα το κράτημα · 10″/ })).toBeInTheDocument(); // the hold the physio said
    expect(sent).toEqual([
      { type: "setDone", exercise: 0, set: 1 },
      { type: "setDone", exercise: 0, set: 2 },
    ]);
  });

  it("calls the physio with a reason, and only says they were notified", async () => {
    const sent = fakeServer(view());
    render(<SessionScreen initial={view()} />);
    await userEvent.click(screen.getByRole("button", { name: "Χρειάζομαι τον φυσιοθεραπευτή" }));
    await userEvent.click(screen.getByRole("button", { name: "Πονάω" }));
    expect(await screen.findByText("Ο φυσιοθεραπευτής ειδοποιήθηκε")).toBeInTheDocument();
    expect(sent).toEqual([{ type: "call", reason: "pain" }]);
  });

  it("has no accessibility problems", async () => {
    fakeServer(view());
    const { container } = render(<SessionScreen initial={view()} />);
    await expectNoA11yViolations(container);
  });
});
