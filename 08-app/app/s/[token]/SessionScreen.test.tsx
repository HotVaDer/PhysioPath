import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { PatientAction, PatientView } from "@/app/lib/board/session";
import type { Exercise, PatientProgram } from "@/app/lib/notes/schema";
import { SessionScreen } from "@/app/s/[token]/SessionScreen";
import { expectNoA11yViolations } from "@/app/test/axe";

const TOKEN = "0b6c4a52-7d55-4c5e-9a43-2f0c1a7e9d11";
const exercise = (name: string, sets: number | null, hold: string | null = null): Exercise => ({
  name,
  sets,
  reps: "10",
  hold,
  frequency: "2 φορές τη μέρα",
  notes: null,
});
const program: PatientProgram & { version: 1 } = {
  version: 1,
  patient_first_name: "Ελένη",
  title: "Δεξιός ώμος",
  exercises: [exercise("Ολίσθηση στον τοίχο", 2), exercise("Ισομετρική έξω στροφή", null, "10 δευτερόλεπτα"), exercise("Εκκρεμές", 1)],
  after_exercises: [],
  avoid: [],
  contact_if: [],
  other: [],
  next_appointment: null,
};
const start = (over: Partial<PatientView> = {}): PatientView => ({
  program,
  setsTarget: [2, 1, 1],
  setsDone: [0, 0, 0],
  current: 0,
  call: null,
  finishedAt: null,
  homeToken: null,
  clinicName: "Κλινική Α",
  updatedAt: "2026-11-18T10:00:00Z",
  ...over,
});

// A fake server with the same rules as patient_action() in the database.
function fakeServer(first: PatientView) {
  let v = structuredClone(first);
  const sent: PatientAction[] = [];
  const firstNotDone = (skip: number) => v.setsTarget.findIndex((t, i) => i !== skip && v.setsDone[i] < t);
  vi.stubGlobal(
    "fetch",
    vi.fn(async (_url: string, init?: RequestInit) => {
      if (init?.method === "POST") {
        const a = JSON.parse(String(init.body)) as PatientAction;
        sent.push(a);
        if (!v.finishedAt) {
          if (a.type === "setDone" && v.setsDone[a.exercise] === a.set - 1 && v.setsDone[a.exercise] < v.setsTarget[a.exercise]) {
            v.setsDone[a.exercise] += 1;
            const complete = v.setsDone[a.exercise] >= v.setsTarget[a.exercise];
            v.current = complete ? (firstNotDone(a.exercise) >= 0 ? firstNotDone(a.exercise) : a.exercise) : a.exercise;
          }
          if (a.type === "undoSet" && v.setsDone[a.exercise] === a.set && a.set > 0) v.setsDone[a.exercise] -= 1;
          if (a.type === "show") v.current = a.exercise;
          if (a.type === "call") v.call = { reason: a.reason, at: "2026-11-18T10:05:00Z" };
          if (a.type === "cancelCall") v.call = null;
        }
      }
      return new Response(JSON.stringify(v), { status: 200 });
    }),
  );
  return sent;
}

afterEach(() => vi.unstubAllGlobals());

describe("SessionScreen", () => {
  it("shows one exercise at a time and moves on after the last set", async () => {
    const sent = fakeServer(start());
    render(<SessionScreen token={TOKEN} initial={start()} />);
    expect(screen.getByRole("heading", { level: 1, name: "Ολίσθηση στον τοίχο" })).toBeInTheDocument();
    expect(screen.getByText("Άσκηση 1 από 3")).toBeInTheDocument();
    expect(screen.queryByText(/2 φορές τη μέρα/)).not.toBeInTheDocument(); // how often is for home

    await userEvent.click(screen.getByRole("button", { name: "Τελείωσα το σετ 1" }));
    await userEvent.click(await screen.findByRole("button", { name: "Τελείωσα το σετ 2" }));

    expect(await screen.findByRole("heading", { level: 1, name: "Ισομετρική έξω στροφή" })).toBeInTheDocument();
    expect(screen.getByText(/«Ολίσθηση στον τοίχο» έγινε/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^Ξεκίνα · 10″\s*το κράτημα$/ })).toBeInTheDocument();
    expect(screen.getByText("Πατήστε όταν είστε έτοιμοι")).toBeInTheDocument();
    expect(screen.queryByText(/1 σετ/)).not.toBeInTheDocument(); // one set is just the reps
    expect(sent).toEqual([
      { type: "setDone", exercise: 0, set: 1 },
      { type: "setDone", exercise: 0, set: 2 },
    ]);
  });

  it("a box per exercise: tapping one goes there; the board hears it ('show')", async () => {
    const sent = fakeServer(start());
    render(<SessionScreen token={TOKEN} initial={start()} />);
    expect(screen.getByRole("button", { name: /^Άσκηση 1: Ολίσθηση στον τοίχο, τώρα$/ })).toHaveAttribute("aria-current", "step");
    await userEvent.click(screen.getByRole("button", { name: /^Άσκηση 3: Εκκρεμές/ }));
    expect(screen.getByRole("heading", { level: 1, name: "Εκκρεμές" })).toBeInTheDocument();
    expect(screen.getByText("Άσκηση 3 από 3")).toBeInTheDocument();
    expect(sent).toEqual([{ type: "show", exercise: 2 }]);
  });

  it("«Αναίρεση» takes back the last set, even right after the screen moved on", async () => {
    const after = start({ setsDone: [2, 0, 0], current: 1 });
    const sent = fakeServer(after);
    render(<SessionScreen token={TOKEN} initial={after} />);
    await userEvent.click(screen.getByRole("button", { name: "Αναίρεση τελευταίου σετ" }));
    expect(sent).toEqual([{ type: "undoSet", exercise: 0, set: 2 }]);
  });

  it("«Χρειάζομαι τον φυσιοθεραπευτή» at the bottom: the reason, then «ειδοποιήθηκε» and cancel", async () => {
    const sent = fakeServer(start());
    render(<SessionScreen token={TOKEN} initial={start()} />);
    await userEvent.click(screen.getByRole("button", { name: "Χρειάζομαι τον φυσιοθεραπευτή" }));
    await userEvent.click(screen.getByRole("button", { name: "Πονάω" }));
    expect(await screen.findByText("Ο φυσιοθεραπευτής ειδοποιήθηκε")).toBeInTheDocument();
    expect(screen.getByText("Είπατε ότι πονάτε.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Χρειάζομαι τον φυσιοθεραπευτή" })).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Ακύρωση κλήσης" }));
    expect(await screen.findByRole("button", { name: "Χρειάζομαι τον φυσιοθεραπευτή" })).toBeEnabled();
    expect(sent).toEqual([{ type: "call", reason: "pain" }, { type: "cancelCall" }]);
  });

  it("everything done: «Τελειώσατε»; after «Τέλος»: the home program link", () => {
    fakeServer(start());
    const { unmount } = render(<SessionScreen token={TOKEN} initial={start({ setsDone: [2, 1, 1], current: 2 })} />);
    expect(screen.getByRole("heading", { level: 1, name: "Τελειώσατε τις ασκήσεις" })).toBeInTheDocument();
    unmount();

    const home = "9f1f2b1e-1111-4222-8333-444455556666";
    render(<SessionScreen token={TOKEN} initial={start({ finishedAt: "2026-11-18T10:30:00Z", homeToken: home })} />);
    expect(screen.getByRole("heading", { level: 1, name: "Η συνεδρία ολοκληρώθηκε" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Το πρόγραμμα για το σπίτι" })).toHaveAttribute("href", `/p/${home}`);
    expect(screen.queryByRole("button", { name: /Τελείωσα/ })).not.toBeInTheDocument();
  });

  it("has no accessibility problems: the exercise, the call choices, and everything done", async () => {
    fakeServer(start());
    const { container, unmount } = render(<SessionScreen token={TOKEN} initial={start()} />);
    await expectNoA11yViolations(container);
    await userEvent.click(screen.getByRole("button", { name: "Χρειάζομαι τον φυσιοθεραπευτή" }));
    await expectNoA11yViolations(container);
    unmount();
    const done = render(<SessionScreen token={TOKEN} initial={start({ setsDone: [2, 1, 1], current: 2 })} />);
    await expectNoA11yViolations(done.container);
  });
});
