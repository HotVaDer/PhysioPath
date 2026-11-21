import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { PatientAction, PatientView } from "@/app/lib/board/session";
import type { Exercise, PatientProgram } from "@/app/lib/notes/schema";
import { SessionScreen } from "@/app/s/[token]/SessionScreen";
import { expectNoA11yViolations } from "@/app/test/axe";

const TOKEN = "0b6c4a52-7d55-4c5e-9a43-2f0c1a7e9d11";
const CALL = "Φυσιοθεραπευτής: χρειάζομαι βοήθεια";
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

// A fake server with the same rules as patient_action() in the database. `server.view` is what it
// holds now (a test can change it, like the staff would), `server.offline` makes every request fail.
function fakeServer(first: PatientView) {
  const server = { view: structuredClone(first), sent: [] as PatientAction[], gets: 0, offline: false };
  const firstNotDone = (v: PatientView, skip: number) => v.setsTarget.findIndex((t, i) => i !== skip && v.setsDone[i] < t);
  vi.stubGlobal(
    "fetch",
    vi.fn(async (_url: string, init?: RequestInit) => {
      if (server.offline) throw new TypeError("Failed to fetch");
      const v = server.view;
      if (init?.method === "POST") {
        const a = JSON.parse(String(init.body)) as PatientAction;
        server.sent.push(a);
        if (!v.finishedAt) {
          if (a.type === "setDone" && v.setsDone[a.exercise] === a.set - 1 && v.setsDone[a.exercise] < v.setsTarget[a.exercise]) {
            v.setsDone[a.exercise] += 1;
            const complete = v.setsDone[a.exercise] >= v.setsTarget[a.exercise];
            v.current = complete ? (firstNotDone(v, a.exercise) >= 0 ? firstNotDone(v, a.exercise) : a.exercise) : a.exercise;
          }
          if (a.type === "undoSet" && v.setsDone[a.exercise] === a.set && a.set > 0) v.setsDone[a.exercise] -= 1;
          if (a.type === "show") v.current = a.exercise;
          if (a.type === "call") v.call = { reason: a.reason, at: "2026-11-18T10:05:00Z" };
          if (a.type === "cancelCall") v.call = null;
        }
      } else server.gets += 1;
      return new Response(JSON.stringify(v), { status: 200 });
    }),
  );
  return server;
}

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  localStorage.clear();
  document.documentElement.style.fontSize = "";
});

describe("SessionScreen", () => {
  it("shows one exercise at a time and moves on after the last set", async () => {
    const server = fakeServer(start());
    render(<SessionScreen token={TOKEN} initial={start()} />);
    expect(screen.getByRole("heading", { level: 1, name: "Ολίσθηση στον τοίχο" })).toBeInTheDocument();
    expect(screen.getByText("Άσκηση 1 από 3")).toBeInTheDocument();
    expect(screen.queryByText(/2 φορές τη μέρα/)).not.toBeInTheDocument(); // how often is for home
    expect(screen.getByText("Ισομετρική έξω στροφή", { selector: "p" }).textContent).toBe("Μετά: Ισομετρική έξω στροφή");

    await userEvent.click(screen.getByRole("button", { name: "Τελείωσα το σετ 1" }));
    expect(await screen.findByText("Σετ 1, έγινε")).toBeInTheDocument();
    await userEvent.click(await screen.findByRole("button", { name: "Τελείωσα το σετ 2" }));

    expect(await screen.findByRole("heading", { level: 1, name: "Ισομετρική έξω στροφή" })).toBeInTheDocument();
    expect(screen.getByText(/«Ολίσθηση στον τοίχο» έγινε/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Ξεκίνα το κράτημα" })).toBeInTheDocument();
    expect(screen.getByText("Κράτημα 10 δευτερόλεπτα")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Τελείωσα την άσκηση" })).toBeInTheDocument(); // no sets said: one go
    expect(server.sent).toEqual([
      { type: "setDone", exercise: 0, set: 1 },
      { type: "setDone", exercise: 0, set: 2 },
    ]);
  });

  it("the clinic's letterhead and «Για: <name>», as on the home program; no «Για:» without a name", () => {
    fakeServer(start());
    const { unmount } = render(<SessionScreen token={TOKEN} initial={start()} />);
    expect(screen.getByText("Κλινική Α")).toBeInTheDocument();
    expect(screen.getByText("Ελένη")).toBeInTheDocument();
    unmount();

    const nameless = start({ program: { ...program, patient_first_name: null } });
    render(<SessionScreen token={TOKEN} initial={nameless} />);
    expect(screen.getByText("Κλινική Α")).toBeInTheDocument();
    expect(screen.queryByText("Για:")).not.toBeInTheDocument();
  });

  it("the hold countdown: start, count down, then «Τέλος κρατήματος»", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const view = start({ setsDone: [2, 0, 0], current: 1 });
    fakeServer(view);
    render(<SessionScreen token={TOKEN} initial={view} />);
    await userEvent.click(screen.getByRole("button", { name: "Ξεκίνα το κράτημα" }));
    expect(screen.getByText("Κρατήστε…")).toBeInTheDocument();
    for (let s = 0; s < 10; s++) await act(() => vi.advanceTimersByTimeAsync(1_000));
    expect(screen.getByText("Τέλος κρατήματος")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Ξανά από την αρχή" })).toBeInTheDocument();
  });

  it("«Όλες οι ασκήσεις» → another exercise; the board hears it ('show')", async () => {
    const view = start({ setsDone: [1, 0, 0], current: 1 }); // the first one half done, now on the second
    const server = fakeServer(view);
    render(<SessionScreen token={TOKEN} initial={view} />);
    await userEvent.click(screen.getByRole("button", { name: "Όλες οι ασκήσεις" }));
    const list = screen.getByRole("list", { name: "Όλες οι ασκήσεις" }); // the path as a list
    expect(within(list).getByRole("button", { name: /Ισομετρική έξω στροφή/ })).toHaveAttribute("aria-current", "step");
    expect(within(list).getByText("Σετ 1 από 2 έγιναν")).toBeInTheDocument();
    expect(within(list).getByText("Τώρα")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /Εκκρεμές/ }));
    expect(screen.getByRole("heading", { level: 1, name: "Εκκρεμές" })).toBeInTheDocument();
    expect(screen.getByText("Άσκηση 3 από 3")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Κλείσιμο" })).not.toBeInTheDocument(); // the list closed
    expect(server.sent).toEqual([{ type: "show", exercise: 2 }]);
  });

  it("«Αναίρεση» takes back the last set, even right after the screen moved on", async () => {
    const after = start({ setsDone: [2, 0, 0], current: 1 });
    const server = fakeServer(after);
    render(<SessionScreen token={TOKEN} initial={after} />);
    await userEvent.click(screen.getByRole("button", { name: "Αναίρεση τελευταίου σετ" }));
    expect(server.sent).toEqual([{ type: "undoSet", exercise: 0, set: 2 }]);
  });

  it("«Φυσιοθεραπευτής» in the top bar: the reason, then «Ειδοποιήθηκε» and cancel", async () => {
    const server = fakeServer(start());
    render(<SessionScreen token={TOKEN} initial={start()} />);
    await userEvent.click(screen.getByRole("button", { name: CALL }));
    expect(screen.getByRole("group", { name: "Γιατί χρειάζεστε τον φυσιοθεραπευτή;" })).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Πονάω" }));

    expect(await screen.findByText("Ο φυσιοθεραπευτής ειδοποιήθηκε. Είπατε ότι πονάτε.")).toBeInTheDocument();
    expect(screen.queryByRole("group", { name: "Γιατί χρειάζεστε τον φυσιοθεραπευτή;" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Ο φυσιοθεραπευτής ειδοποιήθηκε" })).toBeDisabled();
    expect(screen.queryByRole("button", { name: CALL })).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Ακύρωση κλήσης" }));
    expect(await screen.findByRole("button", { name: CALL })).toBeEnabled();
    expect(server.sent).toEqual([{ type: "call", reason: "pain" }, { type: "cancelCall" }]);
  });

  it("«Αα» opens the three text sizes; the choice is shared with the home program", async () => {
    fakeServer(start());
    render(<SessionScreen token={TOKEN} initial={start()} />);
    await userEvent.click(screen.getByRole("button", { name: "Αα, μέγεθος γραμμάτων" }));
    await userEvent.click(screen.getByRole("radio", { name: "Μεγάλα" }));
    expect(document.documentElement.style.fontSize).toBe("175%");
    expect(localStorage.getItem("physiopath:text-size")).toBe("xlarge");
  });

  it("no connection: says so above the button, and «Δοκιμάστε ξανά» clears it", async () => {
    const server = fakeServer(start());
    render(<SessionScreen token={TOKEN} initial={start()} />);
    server.offline = true;
    await userEvent.click(screen.getByRole("button", { name: "Τελείωσα το σετ 1" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Δεν υπάρχει σύνδεση. Δοκιμάζουμε ξανά μόνο του.");
    expect(screen.getByRole("button", { name: "Τελείωσα το σετ 1" })).toBeEnabled(); // can press again

    server.offline = false;
    await userEvent.click(screen.getByRole("button", { name: "Δοκιμάστε ξανά" }));
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("asks again every 3 s and shows «Τέλος» from the staff", async () => {
    vi.useFakeTimers();
    const server = fakeServer(start());
    render(<SessionScreen token={TOKEN} initial={start()} />);
    await act(() => vi.advanceTimersByTimeAsync(2_900));
    expect(server.gets).toBe(0);
    await act(() => vi.advanceTimersByTimeAsync(200));
    expect(server.gets).toBe(1);

    const home = "9f1f2b1e-1111-4222-8333-444455556666";
    server.view = { ...server.view, finishedAt: "2026-11-18T10:30:00Z", homeToken: home };
    await act(() => vi.advanceTimersByTimeAsync(3_000));
    expect(screen.getByRole("heading", { level: 1, name: "Η συνεδρία ολοκληρώθηκε" })).toBeInTheDocument();
    await act(() => vi.advanceTimersByTimeAsync(9_000));
    expect(server.gets).toBe(2); // stopped after «Τέλος»
  });

  it("everything done: «Τελειώσατε»; after «Τέλος»: the home program link", () => {
    fakeServer(start());
    const { unmount } = render(<SessionScreen token={TOKEN} initial={start({ setsDone: [2, 1, 1], current: 2 })} />);
    expect(screen.getByRole("heading", { level: 1, name: "Τελειώσατε τις ασκήσεις" })).toBeInTheDocument();
    expect(screen.getByText("3 από 3 ασκήσεις έγιναν")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Τελείωσα/ })).not.toBeInTheDocument();
    unmount();

    const home = "9f1f2b1e-1111-4222-8333-444455556666";
    render(<SessionScreen token={TOKEN} initial={start({ finishedAt: "2026-11-18T10:30:00Z", homeToken: home })} />);
    expect(screen.getByRole("heading", { level: 1, name: "Η συνεδρία ολοκληρώθηκε" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Το πρόγραμμα για το σπίτι" })).toHaveAttribute("href", `/p/${home}`);
    expect(screen.queryByRole("button", { name: /Τελείωσα/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: CALL })).not.toBeInTheDocument(); // no calling after «Τέλος»
  });

  it("has no accessibility problems: the exercise, the call and the list open, and after «Τέλος»", async () => {
    fakeServer(start());
    const { container, unmount } = render(<SessionScreen token={TOKEN} initial={start({ setsDone: [1, 0, 0] })} />);
    await expectNoA11yViolations(container);
    await userEvent.click(screen.getByRole("button", { name: CALL }));
    await expectNoA11yViolations(container);
    await userEvent.click(screen.getByRole("button", { name: "Όλες οι ασκήσεις" }));
    await expectNoA11yViolations(container);
    unmount();

    const called = render(<SessionScreen token={TOKEN} initial={start({ call: { reason: "question", at: "2026-11-18T10:05:00Z" } })} />);
    await expectNoA11yViolations(called.container);
    called.unmount();

    const done = render(<SessionScreen token={TOKEN} initial={start({ finishedAt: "2026-11-18T10:30:00Z", homeToken: TOKEN })} />);
    await expectNoA11yViolations(done.container);
  });
});
